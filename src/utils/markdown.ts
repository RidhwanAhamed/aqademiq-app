// Purpose: Helper utilities for markdown handling until API returns sanitized previews. TODO: API -> /api/chat/messages should include plain-text preview.

const EMPHASIS_MARKERS = /(\*\*|\*|__|_|~~|`|>)/g;
const MULTIPLE_SPACES = /\s+/g;

export function stripMarkdown(source?: string): string {
  if (!source) return '';
  return source
    .replace(EMPHASIS_MARKERS, '')
    .replace(MULTIPLE_SPACES, ' ')
    .trim();
}

