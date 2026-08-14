import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Validate the caller's JWT before an Edge Function touches health data.
export async function getRequestUser(req: Request) {
  const authorization = req.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization || !supabaseUrl || !anonKey) return null;

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}
