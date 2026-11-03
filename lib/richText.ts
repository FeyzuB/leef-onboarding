import sanitizeHtml from 'sanitize-html';
import { isRichText } from './richTextFormat';

/**
 * Step explanations can be rich text (HTML from the editor) or older plain text.
 * HTML is cleaned to a small allowlist on save and again on display, so only formatting survives:
 * no scripts, no event handlers, no styles other than a text colour, links only to http(s), mailto and tel,
 * and images only as pasted PNG/JPEG/GIF/WebP data.
 */
// Raster images only; SVG could carry scripts.
const IMAGE_DATA = /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'h3', 'h4', 'blockquote', 'code', 'span', 'hr', 'img'],
  allowedAttributes: { a: ['href', 'target', 'rel'], span: ['style'], img: ['src', 'alt'], ol: ['start'] },
  // Images only as pasted data (no links to other sites, so nothing is loaded from elsewhere).
  allowedSchemesByTag: { img: ['data'] },
  exclusiveFilter: (frame) => frame.tag === 'img' && !IMAGE_DATA.test(frame.attribs.src ?? ''),
  allowedStyles: { span: { color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i] } },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
  transformTags: {
    // A numbered list may continue after an image; keep only a sane number.
    ol: (tagName, attribs): sanitizeHtml.Tag => ({
      tagName,
      attribs: /^\d{1,3}$/.test(attribs.start ?? '') ? { start: attribs.start } : ({} as sanitizeHtml.Attributes),
    }),
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } }),
  },
};

export function sanitizeRichText(html: string): string {
  const clean = sanitizeHtml(html, OPTIONS)
    // Empty paragraphs at the end (e.g. left over from a paste) add nothing.
    .replace(/(<p>\s*(<br\s*\/?>)?\s*<\/p>\s*)+$/i, '')
    .trim();
  // An editor with nothing typed in it still sends "<p></p>".
  return sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).trim() || /<img /.test(clean) ? clean : '';
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
