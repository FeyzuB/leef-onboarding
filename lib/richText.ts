import sanitizeHtml from 'sanitize-html';
import { isRichText } from './richTextFormat';

/**
 * Step explanations can be rich text (HTML from the editor) or older plain text.
 * HTML is cleaned to a small allowlist on save and again on display, so only formatting survives:
 * no scripts, no event handlers, no styles other than a text colour, and links only to http(s), mailto and tel.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'h3', 'h4', 'blockquote', 'code', 'span', 'hr'],
  allowedAttributes: { a: ['href', 'target', 'rel'], span: ['style'] },
  allowedStyles: { span: { color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i] } },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } }),
  },
};

export function sanitizeRichText(html: string): string {
  const clean = sanitizeHtml(html, OPTIONS)
    // Empty paragraphs at the end (e.g. left over from a paste) add nothing.
    .replace(/(<p>\s*(<br\s*\/?>)?\s*<\/p>\s*)+$/i, '')
    .trim();
  // An editor with nothing typed in it still sends "<p></p>".
  return sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).trim() ? clean : '';
}

/** The explanation as typed: rich text is cleaned, plain text is kept as is. */
export function cleanExplanation(value: string): string {
  return isRichText(value) ? sanitizeRichText(value) : value;
}

/** Plain text for one-line previews. */
export function toPlainText(value: string): string {
  if (!isRichText(value)) return value;
  return sanitizeHtml(value.replace(/<\/(p|li|h3|h4|blockquote)>|<br\s*\/?>/gi, ' '), { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();
}
