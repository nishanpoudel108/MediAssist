// Edge Function: revoke-access
// Immediate revocation — deletes the permission row, which RLS enforces instantly.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, handleOptions } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const supabase = createClient(supabaseUrl, serviceRole);
    const { permission_id, patient_id } = await req.json();
    if (!permission_id) return jsonResponse({ error: 'permission_id required' }, 400);

    const { error } = await supabase
      .from('permissions')
      .delete()
      .eq('id', permission_id);
    if (error) return jsonResponse({ error: error.message }, 400);

    await supabase.from('audit_logs').insert([
      { actor_id: patient_id, patient_id, action: 'revoke', resource: `permission:${permission_id}` },
    ]);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
