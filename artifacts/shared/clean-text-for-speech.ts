export function cleanTextForSpeech(text: string): string {
  if (!text) return text;
  let s = String(text);

  // Replace Markdown images and links with their visible text: ![alt](url) -> alt, [text](url) -> text
  s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove Markdown headings (# ...) and blockquote markers (>)
  s = s.replace(/(^|\n)#{1,6}\s+/g, '$1');
  s = s.replace(/(^|\n)>\s+/g, '$1');

  // Remove inline code/backticks and emphasis markers while preserving the inner text where applicable
  s = s.replace(/`+/g, '');
  s = s.replace(/[*_~]+/g, '');

  // Remove emoji and pictographic characters (Extended_Pictographic) and variation selectors
  // \\p{Extended_Pictographic} requires Unicode property escapes. Node 24 supports this.
  s = s.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '');

  // Remove zero-width and invisible control chars commonly used in text/emoji sequences
  s = s.replace(/[\u200B\u200C\u200D\uFEFF\u2060]/gu, '');

  // Normalize whitespace: collapse repeated spaces & tabs, trim edges
  s = s.replace(/[ \t]{2,}/g, ' ');
  s = s.replace(/\s+\n/g, '\n');
  s = s.replace(/\n\s+/g, '\n');
  s = s.replace(/\s{2,}/g, ' ');
  s = s.trim();

  return s;
}
