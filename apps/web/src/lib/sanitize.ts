import sanitizeHtml from 'sanitize-html'

export function sanitizeRulebookHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title'],
    },
  })
}
