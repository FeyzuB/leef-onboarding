// Runs with tsx (see "test" in package.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanExplanation, sanitizeRichText, toPlainText } from '../lib/richText';
import { isRichText, plainToHtml } from '../lib/richTextFormat';

test('rich text keeps formatting and links', () => {
  const html = '<p><strong>E</strong>: <a href="mailto:a@b.nl">a@b.nl</a> <u>u</u> <span style="color: #f26b21">oranje</span></p><blockquote><p>box</p></blockquote>';
  const clean = sanitizeRichText(html);
  assert.match(clean, /<strong>E<\/strong>/);
  assert.match(clean, /<a href="mailto:a@b.nl" target="_blank" rel="noopener noreferrer">/);
  assert.match(clean, /<span style="color:#f26b21">oranje<\/span>/);
  assert.match(clean, /<blockquote><p>box<\/p><\/blockquote>/);
});

test('rich text drops scripts, handlers, bad links and styles', () => {
  const html =
    '<p onclick="x()">a<script>alert(1)</script><img src=x onerror=alert(1)>' +
    '<a href="javascript:alert(1)">j</a><a href=" JaVaScRiPt:alert(1)">k</a><a href="data:text/html,x">d</a>' +
    '<span style="background:url(x);position:fixed">s</span><iframe src="https://x"></iframe><style>p{}</style></p>';
  const clean = sanitizeRichText(html);
  for (const bad of ['script', 'onclick', 'onerror', '<img', 'javascript', 'data:', 'iframe', 'style', 'position']) {
    assert.ok(!clean.toLowerCase().includes(bad), `${bad} in ${clean}`);
  }
  assert.match(clean, /^<p>a/);
});

test('bold inside a plain span survives and trailing empty paragraphs go', () => {
  assert.equal(sanitizeRichText('<p><span><strong>E</strong></span>: x</p><p></p><p><br></p>'), '<p><span><strong>E</strong></span>: x</p>');
});

test('an empty editor saves as empty', () => {
  assert.equal(sanitizeRichText('<p></p>'), '');
  assert.equal(sanitizeRichText('<p> </p><p><br></p>'), '');
});

test('plain text explanations stay plain and open in the editor as paragraphs', () => {
  assert.equal(isRichText('Regel 1\nRegel 2 <b>niet html</b>'), false);
  assert.equal(cleanExplanation('Regel 1\nRegel 2'), 'Regel 1\nRegel 2');
  assert.equal(plainToHtml('a < b\nc'), '<p>a &lt; b</p><p>c</p>');
  assert.equal(toPlainText('<p>Met vriendelijke groet,</p><p><strong>Naam</strong></p>'), 'Met vriendelijke groet, Naam');
});

test('pasted raster images are kept, other image sources are dropped', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  assert.equal(sanitizeRichText(`<p>Klik hier:</p><img src="${png}" alt="knop">`), `<p>Klik hier:</p><img src="${png}" alt="knop" />`);
  assert.equal(sanitizeRichText(`<img src="${png}">`), `<img src="${png}" />`);
  for (const bad of ['https://evil.example/x.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'javascript:alert(1)', 'data:text/html;base64,PGI+']) {
    assert.ok(!sanitizeRichText(`<p>a</p><img src="${bad}" onerror="alert(1)">`).includes('<img'), bad);
  }
});

test('numbered lists keep a sane start number', () => {
  assert.equal(sanitizeRichText('<ol start="4"><li><p>a</p></li></ol>'), '<ol start="4"><li><p>a</p></li></ol>');
  assert.equal(sanitizeRichText('<ol start="4x" onclick="x"><li><p>a</p></li></ol>'), '<ol><li><p>a</p></li></ol>');
});
