import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // row from users table (role)
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      userIdRef.current = session?.user?.id ?? null;
      if (session?.user) {
        fetchProfile(session.user, mounted);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      // Password confirmation while granting family access emits SIGNED_IN.
      // The account is unchanged, so do not remount the entire application.
      if (nextUser?.id && userIdRef.current === nextUser.id) return;

      setUser(nextUser);
      userIdRef.current = nextUser?.id ?? null;
      if (nextUser) {
        // Keep the route guard suspended until the role profile is available.
        // Without this, a successful sign-in can briefly redirect back to /login.
        setLoading(true);
        fetchProfile(nextUser, mounted);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile(authUser, mounted = true) {
    const userId = authUser.id;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!mounted) return;
    let resolvedProfile = data;
    if (error || !data) {
      // Recover accounts made when the database auth trigger was unavailable.
      // The insert policy permits a signed-in user to create only their row.
      resolvedProfile = {
        id: userId,
        email: authUser.email || '',
        full_name: authUser.user_metadata?.full_name || '',
        role: 'patient',
      };
      const { error: createError } = await supabase.from('users').insert([resolvedProfile]);
      if (createError && createError.code !== '23505') {
        console.error('Could not create application profile:', createError.message);
      }
    }
    if (resolvedProfile) {
      setProfile(resolvedProfile);
      if (resolvedProfile.role === 'patient') {
        await ensurePatientProfile(userId, resolvedProfile);
      }
    }
    setLoading(false);
  }

  async function ensurePatientProfile(userId, userProfile) {
    const { error } = await supabase.from('patients').insert([
      {
        id: userId,
        full_name: userProfile.full_name || '',
        email: userProfile.email,
      },
    ]);
    // A duplicate-key error means the profile already exists, which is fine.
    if (error && error.code !== '23505') {
      console.error('Could not create patient profile:', error.message);
    }
  }

  async function signUp({ email, password, role, fullName }) {
    const requestedRole = ['patient', 'family', 'doctor'].includes(role) ? role : 'patient';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: requestedRole },
      },
    });
    if (error) return { error };

    // The database trigger creates the matching role profile atomically with
    // the auth user, including when email confirmation delays the session.
    return { data };
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      setUser(data.user);
      userIdRef.current = data.user.id;
      setLoading(true);
      await fetchProfile(data.user);
    }
    return { data, error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    userIdRef.current = null;
  }

  async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_APP_URL || ''}/reset-password`,
    });
    return { data, error };
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
