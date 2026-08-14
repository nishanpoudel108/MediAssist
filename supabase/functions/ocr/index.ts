// Edge Function: ocr
// Server-side OCR pipeline triggered after a report upload.
// Uses Tesseract.js in the Edge Function runtime to extract text.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, handleOptions } from '../_shared/cors.ts';
import { createWorker } from 'https://esm.sh/tesseract.js@5';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return handleOptions();
  try {
    const { report_id, file_path } = await req.json();
    if (!report_id || !file_path) {
      return jsonResponse({ error: 'report_id and file_path required' }, 400);
    }

    const supabase = createClient(supabaseUrl, serviceRole);

    // Download file from storage
    const { data, error: dlError } = await supabase.storage
      .from('reports')
      .download(file_path);
    if (dlError) return jsonResponse({ error: dlError.message }, 400);

    // Run OCR
    const worker = await createWorker('eng');
    const { data: ocrData } = await worker.recognize(await data.arrayBuffer());
    await worker.terminate();
    const text = ocrData?.text || '';

    // Store extracted text on the report
    await supabase
      .from('medical_reports')
      .update({ extracted_text: text, status: 'ocr_complete' })
      .eq('id', report_id);

    return jsonResponse({ extracted_text: text });
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
