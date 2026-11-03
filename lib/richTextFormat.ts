/** Shared by the editor (client) and the server: tells rich text from older plain-text explanations. */
export function isRichText(value: string): boolean {
  return /^\s*<(p|ul|ol|h3|h4|blockquote|hr)[\s>]/i.test(value);
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Opens older plain text in the editor: one paragraph per line. */
export function plainToHtml(value: string): string {
  if (!value) return '';
  if (isRichText(value)) return value;
  return value
    .split('\n')
    .map((line) => `<p>${escape(line)}</p>`)
    .join('');
}
