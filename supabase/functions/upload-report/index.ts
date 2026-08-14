// Edge Function: upload-report
// Orchestrates: storage upload → OCR trigger → AI analysis → save results.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, handleOptions } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const supabase = createClient(supabaseUrl, serviceRole);
    const body = await req.json();
    const { patient_id, title, file_path, extracted_text, locale = 'en' } = body;

    if (!patient_id || !file_path) {
      return jsonResponse({ error: 'patient_id and file_path required' }, 400);
    }

    // Insert report
    const { data: report, error: insertErr } = await supabase
      .from('medical_reports')
      .insert([{ patient_id, title, file_path, extracted_text }])
      .select()
      .single();
    if (insertErr) return jsonResponse({ error: insertErr.message }, 400);

    // Trigger OCR + AI analysis (in production, enqueue via pg_cron or a queue).
    // For this scaffold, we invoke the analyze-report function with extracted_text.
    let analysis = null;
    if (extracted_text) {
      const aiRes = await fetch(
        `${supabaseUrl}/functions/v1/analyze-report`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceRole}` },
          body: JSON.stringify({ text: extracted_text, locale }),
        }
      );
      analysis = await aiRes.json();
      await supabase.from('ai_analysis').insert([
        {
          report_id: report.id,
          summary: analysis.explanation,
          flagged_values: analysis.flagged_values || [],
          next_steps: analysis.next_steps || [],
          disclaimer: analysis.disclaimer,
          is_emergency: !!analysis.is_emergency,
        },
      ]);
    }

    return jsonResponse({ ok: true, report, analysis });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
