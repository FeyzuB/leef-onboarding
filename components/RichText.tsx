import { cleanExplanation } from '@/lib/richText';
import { isRichText } from '@/lib/richTextFormat';

/** Shows a step explanation: rich text with its formatting, older plain text with its line breaks. */
export function RichText({ value, className = '' }: { value: string; className?: string }) {
  if (!value) return null;
  if (!isRichText(value)) return <p className={`whitespace-pre-line ${className}`}>{value}</p>;
  // Cleaned again on display, on top of the clean on save.
  return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: cleanExplanation(value) }} />;
}
