// Edge Function: audit-log
// Centralized audit logging for every access to a patient record.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, handleOptions } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const supabase = createClient(supabaseUrl, serviceRole);
    const { actor_id, patient_id, action, resource } = await req.json();

    const { error } = await supabase.from('audit_logs').insert([
      { actor_id, patient_id, action, resource },
    ]);
    if (error) return jsonResponse({ error: error.message }, 400);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
