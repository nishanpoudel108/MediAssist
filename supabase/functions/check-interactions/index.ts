// Edge Function: check-interactions
// Given a patient's active medicines, flags interactions/duplicates/side effects.
import { corsHeaders, jsonResponse, handleOptions } from '../_shared/cors.ts';
import { buildGuardrailedPrompt, callAI, attachDisclaimer } from '../_shared/ai.ts';
import { getRequestUser } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    if (!(await getRequestUser(req))) return jsonResponse({ error: 'Unauthorized' }, 401);
    const { medicines, locale = 'en' } = await req.json();
    if (!Array.isArray(medicines) || medicines.length < 2 || medicines.length > 50) {
      return jsonResponse({ error: 'Provide at least two medicines' }, 400);
    }

    const userText =
      'Here are my active medicines: ' +
      medicines.join(', ') +
      '. Flag any potential interactions, duplicates, side effects, and food interactions. ' +
      'Use risk language only, never a diagnosis. Provide next steps.';

    const messages = buildGuardrailedPrompt(userText, locale);
    const result = await callAI(messages);
    const guarded = attachDisclaimer(result, locale);

    return jsonResponse(guarded);
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
