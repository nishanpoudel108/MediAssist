// Edge Function: grant-access
// Opt-in sharing. Revocation is immediate via row delete (see revoke-access).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, handleOptions } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const supabase = createClient(supabaseUrl, serviceRole);
    const { patient_id, grantee_email, grantee_type, scope = 'full' } = await req.json();

    const { data, error } = await supabase.from('permissions').insert([
      { patient_id, grantee_email, grantee_type, scope },
    ]).select().single();
    if (error) return jsonResponse({ error: error.message }, 400);

    // Audit the grant
    await supabase.from('audit_logs').insert([
      { actor_id: patient_id, patient_id, action: 'grant', resource: `permission:${data.id}` },
    ]);

    return jsonResponse({ ok: true, permission: data });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
