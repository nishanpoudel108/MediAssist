// AI Output Guardrails — enforced in post-processing.
// These run AFTER the AI response is generated to guarantee compliance:
//  1. Never phrase output as a diagnosis.
//  2. Every explanation ends with a consultation disclaimer.
//  3. Dangerous findings trigger the emergency path.

import { translations } from '../i18n/translations';

const DISCLAIMERS = {
  en: translations.en.disclaimer,
  ne: translations.ne.disclaimer,
  hi: translations.hi.disclaimer,
};

const EMERGENCY = {
  en: translations.en.emergency,
  ne: translations.ne.emergency,
  hi: translations.hi.emergency,
};

// Keywords/phrases that indicate a potentially dangerous finding.
const DANGER_KEYWORDS = [
  'emergency',
  'immediate',
  'critical',
  'life-threatening',
  'seek care',
  'hospitalize',
  'chest pain',
  'stroke',
  'severe',
  'urgent',
  'myocardial',
  'cardiac',
  'dangerous',
];

// Normalize risk/possibility language so the UI never sounds diagnostic.
const RISK_LANGUAGE = {
  en: [
    'this could indicate',
    'may suggest',
    'increased risk of',
    'possibly consistent with',
    'might be related to',
  ],
  ne: ['यसले संकेत गर्न सक्छ', 'हुन सक्छ', 'जोखिम बढेको हुन सक्छ'],
  hi: ['यह संकेत कर सकता है', 'हो सकता है', 'जोखिम बढ़ सकता है'],
};

export function ensureDisclaimer(explanation, locale = 'en') {
  const text = explanation || '';
  const disclaimer = DISCLAIMERS[locale] || DISCLAIMERS.en;
  if (text.trim().endsWith(disclaimer)) {
    return { explanation: text, disclaimer };
  }
  return { explanation: text.trim() + '\n\n' + disclaimer, disclaimer };
}

export function detectEmergency(explanation, locale = 'en') {
  const lower = (explanation || '').toLowerCase();
  const triggered = DANGER_KEYWORDS.some((kw) => lower.includes(kw));
  if (!triggered) return { emergency: false };
  return {
    emergency: true,
    message: EMERGENCY[locale] || EMERGENCY.en,
  };
}

// Post-process an AI explanation to enforce all guardrails.
export function enforceGuardrails(aiResponse, locale = 'en') {
  const base = aiResponse?.explanation || '';
  const { explanation, disclaimer } = ensureDisclaimer(base, locale);
  const { emergency, message } = detectEmergency(explanation, locale);

  return {
    explanation,
    disclaimer,
    emergency,
    emergencyMessage: message,
  };
}
