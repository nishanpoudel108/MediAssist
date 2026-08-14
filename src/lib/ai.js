// Client-side wrapper for AI analysis.
// In production this calls the Supabase Edge Function which holds the API key.
// The Edge Function constructs the guardrailed prompt and calls OpenAI/Gemini.

import { supabase } from './supabase';

async function invoke(name, body, fallbackMessage) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const status = error.context?.status;
    let detail = '';
    if (typeof error.context?.clone === 'function') {
      try {
        const payload = await error.context.clone().json();
        detail = payload?.error || payload?.message || '';
      } catch {
        // The gateway may return a non-JSON response. Use the standard error below.
      }
    }
    if (status === 404) {
      throw new Error(`The ${name} service has not been deployed to Supabase yet.`);
    }
    throw new Error(detail || error.message || fallbackMessage);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function analyzeReport(text, locale = 'en') {
  return invoke('analyze-report', { text, locale }, 'AI analysis failed.');
}

export async function checkMedicineInteractions(medicines, locale = 'en') {
  return invoke('check-interactions', { medicines, locale }, 'Interaction check failed.');
}
