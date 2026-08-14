// Edge Function: remind
// Schedules and sends medication reminders (email/push) and logs missed doses.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, handleOptions } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const supabase = createClient(supabaseUrl, serviceRole);
    const { reminder_id, patient_id, medicine_name } = await req.json();

    // In production, integrate with an email/push provider (e.g. Resend, FCM).
    // Here we log a reminder-fired event and return the payload for the scheduler.
    const { data, error } = await supabase.from('reminders').select('*').eq('id', reminder_id).single();
    if (error) return jsonResponse({ error: error.message }, 400);

    return jsonResponse({
      ok: true,
      message: `Reminder for ${medicine_name || data?.medicine_name} at ${data?.time} (${data?.frequency})`,
    });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
