// Administrator-only account deletion. The service key is used only after the
// caller's JWT has been verified and their database role has been checked.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsonResponse, handleOptions } from '../_shared/cors.ts';
import { getRequestUser } from '../_shared/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions();
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const caller = await getRequestUser(req);
    if (!caller) return jsonResponse({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceRole);
    const { data: callerProfile } = await admin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single();
    if (callerProfile?.role !== 'admin') return jsonResponse({ error: 'Forbidden' }, 403);

    const { user_id } = await req.json();
    if (!user_id || user_id === caller.id) {
      return jsonResponse({ error: 'Choose another account to delete' }, 400);
    }

    const { error } = await admin.auth.admin.deleteUser(user_id);
    if (error) return jsonResponse({ error: error.message }, 400);
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
