import sanitizeHtml from 'sanitize-html'

/** Allow-list for rich text written by editors and teachers (XSS protection on write). */
export const sanitizeRichText = (html: string) => sanitizeHtml(html, {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'sub', 'sup', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
    'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img', 'span', 'figure', 'figcaption'],
  allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height'], span: ['class', 'data-latex'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'] },
  allowedSchemes: ['https', 'mailto'],
  allowedSchemesByTag: { img: ['https', 'data'] },
  transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }) },
})

/** Plain text for prompts, search and notifications. */
export const htmlToText = (html: string) =>
  sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim()
