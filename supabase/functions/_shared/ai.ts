// // Shared AI provider + guardrail construction for Edge Functions.
// // The prompt enforces: never diagnose, always disclaim, use risk language.
// // The API key is read from environment variables (never hardcoded).

// const PROVIDER = Deno.env.get('AI_PROVIDER') || 'openai';
// const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
// const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');

// const DISCLAIMERS: Record<string, string> = {
//   en: 'This AI explanation is for informational purposes only and is not a diagnosis. Always consult a licensed healthcare professional for medical advice.',
//   ne: 'यो AI व्याख्या जानकारीका लागि मात्र हो र यो निदान होइन। चिकित्सकीय सल्लाहका लागि सधैं इजाजतपत्र प्राप्त स्वास्थ्यकर्मीसँग परामर्श गर्नुहोस्।',
//   hi: 'यह एआई व्याख्या केवल जानकारी के लिए है और यह निदान नहीं है। चिकित्सा सलाह के लिए हमेशा लाइसेंस प्राप्त स्वास्थ्य पेशेवर से परामर्श करें।',
// };

// // Build the system prompt with mandatory guardrails.
// export function buildGuardrailedPrompt(userText: string, locale = 'en') {
//   return [
//     {
//       role: 'system',
//       content:
//         'You are a decision-support assistant for patients. You NEVER give a diagnosis. ' +
//         'You always use risk/likelihood language such as "this could indicate", "may suggest", ' +
//         '"increased risk of". You never state a condition as certain. ' +
//         'If findings appear acutely dangerous, mark the response as an emergency. ' +
//         'Always end with a recommendation to consult a licensed professional. ' +
//         `Respond using appropriate language; locale: ${locale}. ` +
//         'Return JSON with fields: { explanation, flagged_values: string[], next_steps: string[], is_emergency: boolean }.',
//     },
//     {
//       role: 'user',
//       content: userText,
//     },
//   ];
// }

// // Call the configured AI provider.
// export async function callAI(messages: unknown[]) {
//   if (PROVIDER === 'gemini') {
//     if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY not set');
//     const res = await fetch(
//       `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_KEY}`,
//       {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           contents: messages.map((m: any) => ({ role: m.role, parts: [{ text: m.content }] })),
//         }),
//       }
//     );
//     const data = await res.json();
//     const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
//     return parseJsonFromText(text);
//   }

//   // default: openai
//   if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY not set');
//   const res = await fetch('https://api.openai.com/v1/chat/completions', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${OPENAI_KEY}`,
//     },
//     body: JSON.stringify({
//       model: 'gpt-4o-mini',
//       messages,
//       response_format: { type: 'json_object' },
//     }),
//   });
//   const data = await res.json();
//   const content = data?.choices?.[0]?.message?.content || '{}';
//   return JSON.parse(content);
// }

// function parseJsonFromText(text: string) {
//   try {
//     const cleaned = text.replace(/```json|```/g, '').trim();
//     return JSON.parse(cleaned);
//   } catch {
//     return { explanation: text, flagged_values: [], next_steps: [], is_emergency: false };
//   }
// }

// // Post-process to guarantee disclaimer is present.
// export function attachDisclaimer(result: any, locale = 'en') {
//   const disclaimer = DISCLAIMERS[locale] || DISCLAIMERS.en;
//   const explanation = result.explanation || '';
//   if (!explanation.includes(disclaimer)) {
//     result.explanation = (explanation.trim() + '\n\n' + disclaimer).trim();
//   }
//   result.disclaimer = disclaimer;
//   return result;
// }
// Shared AI provider + guardrail construction for Supabase Edge Functions.

const PROVIDER = (Deno.env.get('AI_PROVIDER') || 'gemini').toLowerCase();

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');

const GEMINI_MODEL = 'gemini-3.5-flash';

const DISCLAIMERS: Record<string, string> = {
  en: 'This AI explanation is for informational purposes only and is not a diagnosis. Always consult a licensed healthcare professional for medical advice.',

  ne: 'यो AI व्याख्या जानकारीका लागि मात्र हो र यो निदान होइन। चिकित्सकीय सल्लाहका लागि सधैं इजाजतपत्र प्राप्त स्वास्थ्यकर्मीसँग परामर्श गर्नुहोस्।',

  hi: 'यह एआई व्याख्या केवल जानकारी के लिए है और यह निदान नहीं है। चिकित्सा सलाह के लिए हमेशा लाइसेंस प्राप्त स्वास्थ्य पेशेवर से परामर्श करें।',
};

// --------------------------------------------------
// Guardrailed prompt
// --------------------------------------------------

export function buildGuardrailedPrompt(
  userText: string,
  locale = 'en',
) {
  return [
    {
      role: 'system',

      content:
        'You are a decision-support assistant for patients. ' +
        'You NEVER diagnose a medical condition. ' +
        'You NEVER claim certainty about a disease or diagnosis. ' +
        'Use cautious language such as "may indicate", "could suggest", ' +
        '"may be associated with", or "could be worth discussing with a clinician". ' +
        'Do not replace professional medical advice. ' +
        'If the information suggests a potentially urgent or dangerous situation, ' +
        'set is_emergency to true and clearly recommend urgent professional care. ' +
        'Do not invent values or information that are not present in the report. ' +
        'Always provide practical next steps and recommend consultation with a licensed healthcare professional. ' +
        `Respond in the language represented by locale: ${locale}.`,
    },

    {
      role: 'user',
      content: userText,
    },
  ];
}

// --------------------------------------------------
// Gemini
// --------------------------------------------------

async function callGemini(messages: any[]) {
  if (!GEMINI_KEY) {
    throw new Error(
      'GEMINI_API_KEY is not configured in Supabase Edge Function secrets.',
    );
  }

  const systemMessage = messages.find(
    (message) => message.role === 'system',
  );

  const userMessages = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: 'user',
      parts: [
        {
          text: message.content,
        },
      ],
    }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_KEY,
      },

      body: JSON.stringify({
        system_instruction: systemMessage
          ? {
              parts: [
                {
                  text: systemMessage.content,
                },
              ],
            }
          : undefined,

        contents: userMessages,

        generationConfig: {
          temperature: 0.2,

          responseMimeType: 'application/json',

          responseSchema: {
            type: 'OBJECT',

            properties: {
              explanation: {
                type: 'STRING',
              },

              flagged_values: {
                type: 'ARRAY',
                items: {
                  type: 'STRING',
                },
              },

              next_steps: {
                type: 'ARRAY',
                items: {
                  type: 'STRING',
                },
              },

              is_emergency: {
                type: 'BOOLEAN',
              },
            },

            required: [
              'explanation',
              'flagged_values',
              'next_steps',
              'is_emergency',
            ],
          },
        },
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      'Gemini API error:',
      JSON.stringify(data),
    );

    throw new Error(
      data?.error?.message ||
        `Gemini API returned HTTP ${response.status}`,
    );
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    console.error(
      'Gemini returned no content:',
      JSON.stringify(data),
    );

    throw new Error(
      'Gemini returned an empty response.',
    );
  }

  return parseJsonFromText(text);
}

// --------------------------------------------------
// OpenAI fallback
// --------------------------------------------------

async function callOpenAI(messages: any[]) {
  if (!OPENAI_KEY) {
    throw new Error(
      'OPENAI_API_KEY is not configured in Supabase Edge Function secrets.',
    );
  }

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',

        Authorization: `Bearer ${OPENAI_KEY}`,
      },

      body: JSON.stringify({
        model: 'gpt-4o-mini',

        messages,

        response_format: {
          type: 'json_object',
        },
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      'OpenAI API error:',
      JSON.stringify(data),
    );

    throw new Error(
      data?.error?.message ||
        `OpenAI API returned HTTP ${response.status}`,
    );
  }

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      'OpenAI returned an empty response.',
    );
  }

  return parseJsonFromText(content);
}

// --------------------------------------------------
// Provider selector
// --------------------------------------------------

export async function callAI(messages: any[]) {
  if (PROVIDER === 'gemini') {
    return callGemini(messages);
  }

  if (PROVIDER === 'openai') {
    return callOpenAI(messages);
  }

  throw new Error(
    `Unsupported AI_PROVIDER: ${PROVIDER}`,
  );
}

// --------------------------------------------------
// Safe JSON parsing
// --------------------------------------------------

function parseJsonFromText(text: string) {
  try {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return JSON.parse(cleaned);
  } catch (error) {
    console.error(
      'Could not parse AI JSON:',
      error,
    );

    return {
      explanation: text,
      flagged_values: [],
      next_steps: [],
      is_emergency: false,
    };
  }
}

// --------------------------------------------------
// Disclaimer
// --------------------------------------------------

export function attachDisclaimer(
  result: any,
  locale = 'en',
) {
  const disclaimer =
    DISCLAIMERS[locale] || DISCLAIMERS.en;

  const explanation =
    typeof result?.explanation === 'string'
      ? result.explanation
      : '';

  if (!explanation.includes(disclaimer)) {
    result.explanation = (
      explanation.trim() +
      '\n\n' +
      disclaimer
    ).trim();
  }

  result.disclaimer = disclaimer;

  return result;
}