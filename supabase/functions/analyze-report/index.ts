// Edge Function: analyze-report
// Receives extracted text, calls AI, applies guardrails, and stores the analysis.
console.log("analyze-report function started");
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, handleOptions } from '../_shared/cors.ts';
import { buildGuardrailedPrompt, callAI, attachDisclaimer } from '../_shared/ai.ts';
import { getRequestUser } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    if (!(await getRequestUser(req))) return jsonResponse({ error: 'Unauthorized' }, 401);
    const { text, locale = 'en' } = await req.json();
    if (typeof text !== 'string' || !text.trim() || text.length > 20000) {
      return jsonResponse({ error: 'A report text of up to 20,000 characters is required' }, 400);
    }

    const messages = buildGuardrailedPrompt(text, locale);
    const result = await callAI(messages);
    const guarded = attachDisclaimer(result, locale);

    return jsonResponse(guarded);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
