// // Edge Function: ocr
// // Server-side OCR pipeline triggered after a report upload.
// // Uses Tesseract.js in the Edge Function runtime to extract text.
// // import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// import { createClient } from 'npm:@supabase/supabase-js@2';
// import { corsHeaders, jsonResponse, handleOptions } from '../_shared/cors.ts';
// import { createWorker } from 'https://esm.sh/tesseract.js@5';

// const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
// const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Deno.serve(async (req: Request) => {
//   if (req.method === 'OPTIONS') return handleOptions();
//   try {
//     const { report_id, file_path } = await req.json();
//     if (!report_id || !file_path) {
//       return jsonResponse({ error: 'report_id and file_path required' }, 400);
//     }

//     const supabase = createClient(supabaseUrl, serviceRole);

//     // Download file from storage
//     const { data, error: dlError } = await supabase.storage
//       .from('reports')
//       .download(file_path);
//     if (dlError) return jsonResponse({ error: dlError.message }, 400);

//     // Run OCR
//     const worker = await createWorker('eng');
//     const { data: ocrData } = await worker.recognize(await data.arrayBuffer());
//     await worker.terminate();
//     const text = ocrData?.text || '';

//     // Store extracted text on the report
//     await supabase
//       .from('medical_reports')
//       .update({ extracted_text: text, status: 'ocr_complete' })
//       .eq('id', report_id);

//     return jsonResponse({ extracted_text: text });
//   } catch (err) {
//     return jsonResponse({ error: (err as Error).message }, 500);
//   }
// });
// Edge Function: ocr
// Gemini-powered OCR for uploaded medical reports.
//
// Flow:
// Frontend → Supabase Storage → this function → Gemini → extracted text → DB

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  corsHeaders,
  jsonResponse,
  handleOptions,
} from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const GEMINI_MODEL = 'gemini-2.5-flash';

if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL');
}

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

if (!geminiApiKey) {
  console.error('Missing GEMINI_API_KEY');
}

function getMimeType(filePath: string, blobType?: string): string {
  if (blobType) return blobType;

  const extension = filePath.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';

    case 'png':
      return 'image/png';

    case 'webp':
      return 'image/webp';

    case 'gif':
      return 'image/gif';

    case 'pdf':
      return 'application/pdf';

    default:
      return 'application/octet-stream';
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';

  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + chunkSize, bytes.length),
    );

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleOptions();
  }

  try {
    // --------------------------------------------------
    // Validate environment
    // --------------------------------------------------

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          error: 'Supabase server configuration is missing.',
        },
        500,
      );
    }

    if (!geminiApiKey) {
      return jsonResponse(
        {
          error: 'GEMINI_API_KEY is not configured in Supabase Edge Function secrets.',
        },
        500,
      );
    }

    // --------------------------------------------------
    // Read request
    // --------------------------------------------------

    const body = await req.json();

    const { report_id, file_path } = body;

    if (!report_id || !file_path) {
      return jsonResponse(
        {
          error: 'report_id and file_path are required.',
        },
        400,
      );
    }

    console.log('OCR request:', {
      report_id,
      file_path,
    });

    // --------------------------------------------------
    // Supabase admin client
    // --------------------------------------------------

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    // --------------------------------------------------
    // Download report from Storage
    // --------------------------------------------------

    console.log('Downloading file from reports bucket...');

    const {
      data: file,
      error: downloadError,
    } = await supabase.storage
      .from('reports')
      .download(file_path);

    if (downloadError || !file) {
      console.error(
        'Storage download error:',
        downloadError?.message,
      );

      return jsonResponse(
        {
          error:
            downloadError?.message ||
            'Could not download report.',
        },
        400,
      );
    }

    const mimeType = getMimeType(
      file_path,
      file.type,
    );

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    console.log('File downloaded:', {
      mimeType,
      size: bytes.length,
    });

    // Gemini inline input should be kept reasonably small.
    // If reports are larger, use Gemini File API instead.
    const maxBytes = 18 * 1024 * 1024;

    if (bytes.length > maxBytes) {
      return jsonResponse(
        {
          error:
            'Report is too large for inline Gemini OCR. Maximum supported size is approximately 18 MB.',
        },
        413,
      );
    }

    // --------------------------------------------------
    // Convert file to Base64
    // --------------------------------------------------

    const base64Data = bytesToBase64(bytes);

    // --------------------------------------------------
    // Gemini OCR
    // --------------------------------------------------

    console.log(
      `Sending ${mimeType} to Gemini ${GEMINI_MODEL}...`,
    );

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `
You are an OCR engine for a medical record management application.

Extract ALL readable text from the attached medical document/image.

Rules:
- Preserve the original wording as accurately as possible.
- Preserve headings, labels, dates, names, values, units, tables and reference ranges when readable.
- Keep the order of the document.
- Do NOT summarize.
- Do NOT interpret the medical information.
- Do NOT diagnose anything.
- Do NOT add information that is not visible.
- If some text is unreadable, write [unreadable].
- Return ONLY the extracted text.
                  `.trim(),
                },

                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],

          generationConfig: {
            temperature: 0,
            maxOutputTokens: 20000,
          },
        }),
      },
    );

    const geminiResult = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error(
        'Gemini API error:',
        JSON.stringify(geminiResult),
      );

      return jsonResponse(
        {
          error:
            geminiResult?.error?.message ||
            'Gemini OCR request failed.',
        },
        502,
      );
    }

    const extractedText =
      geminiResult?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || '')
        .join('')
        .trim() || '';

    if (!extractedText) {
      console.error(
        'Gemini returned no extracted text:',
        JSON.stringify(geminiResult),
      );

      return jsonResponse(
        {
          error: 'Gemini returned no extracted text.',
        },
        502,
      );
    }

    console.log(
      `OCR completed. Extracted ${extractedText.length} characters.`,
    );

    // --------------------------------------------------
    // Update medical report
    // --------------------------------------------------

    const {
      error: updateError,
    } = await supabase
      .from('medical_reports')
      .update({
        extracted_text: extractedText,
        status: 'ocr_complete',
      })
      .eq('id', report_id);

    if (updateError) {
      console.error(
        'Database update error:',
        updateError.message,
      );

      return jsonResponse(
        {
          error:
            'OCR succeeded, but the extracted text could not be saved.',
          details: updateError.message,
        },
        500,
      );
    }

    // --------------------------------------------------
    // Success
    // --------------------------------------------------

    return jsonResponse({
      success: true,
      extracted_text: extractedText,
      model: GEMINI_MODEL,
    });
  } catch (error) {
    console.error(
      'OCR function error:',
      error instanceof Error
        ? error.stack || error.message
        : error,
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown OCR error.',
      },
      500,
    );
  }
});