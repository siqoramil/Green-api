export type TextPart = { type: 'text'; value: string } | { type: 'link'; value: string; href: string }

const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi
const TRAILING_PUNCTUATION_RE = /[.,!?;:)\]}»]+$/

/**
 * Splits plain text into text/link parts so links can be rendered as <a> elements
 * without ever touching innerHTML. Only http(s) URLs are recognized — `javascript:`
 * and other schemes stay plain text.
 */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  for (const match of text.matchAll(URL_RE)) {
    const raw = match[0]
    const url = raw.replace(TRAILING_PUNCTUATION_RE, '')
    const start = match.index
    if (start > last) parts.push({ type: 'text', value: text.slice(last, start) })
    parts.push({ type: 'link', value: url, href: url })
    last = start + url.length
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
  return parts
}
