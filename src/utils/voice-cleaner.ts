// Purpose: Clean raw speech transcripts for Ada voice input. TODO: API -> /api/transcripts/clean.
/**
 * Removes filler words and fixes spacing to keep transcripts token-efficient.
 * Replace this helper with a backend NLP sanitizer once real audio ingestion exists.
 */
const DEFAULT_FILLERS = [
  'um',
  'uh',
  'like',
  'you know',
  'i mean',
  'sort of',
  'kind of',
  'basically',
  'actually',
  'literally',
  'you see',
  'you know what i mean'
];

const multiWordFillers = DEFAULT_FILLERS.filter(word => word.trim().includes(' '));
const singleWordFillers = DEFAULT_FILLERS.filter(word => !word.trim().includes(' '));

const removeMultiWordFillers = (value: string) => {
  let result = value;
  multiWordFillers.forEach(phrase => {
    const pattern = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    result = result.replace(pattern, ' ');
  });
  return result;
};

const removeSingleWordFillers = (value: string) => {
  if (singleWordFillers.length === 0) return value;
  const pattern = new RegExp(`\\b(${singleWordFillers.join('|')})\\b`, 'gi');
  return value.replace(pattern, ' ');
};

/**
 * Cleans speech transcripts by stripping filler words and tidying punctuation.
 */
export const cleanTranscript = (input: string) => {
  if (!input) return '';

  let sanitized = input.trim();
  sanitized = removeMultiWordFillers(sanitized);
  sanitized = removeSingleWordFillers(sanitized);

  sanitized = sanitized.replace(/\s{2,}/g, ' ');
  sanitized = sanitized.replace(/\s([?.!,])/g, '$1');
  sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();

  if (!sanitized) {
    return '';
  }

  const firstChar = sanitized.charAt(0).toUpperCase();
  return firstChar + sanitized.slice(1);
};

/**
 * Utility to merge a transcript into existing input without double spaces.
 */
export const mergeTranscriptWithInput = (existing: string, transcript: string) => {
  if (!transcript) return existing;
  if (!existing) return transcript;
  const separator = existing.trim().endsWith('.') ? ' ' : ' ';
  return `${existing.trim()}${separator}${transcript}`.trim();
};

