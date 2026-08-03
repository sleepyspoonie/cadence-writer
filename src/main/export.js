// export.js — converts a stored document (Quill Delta) to DOCX, HTML, or
// Markdown, and converts pasted plain text back into a Delta for import.
'use strict'

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  ExternalHyperlink, AlignmentType, LevelFormat, convertInchesToTwip
} = require('docx')

// --- Delta parsing -----------------------------------------------------------
// A Quill Delta is a flat list of inserts. Inline formatting lives on the text
// op; block formatting (header, list, blockquote) arrives on the op carrying
// the newline that *ends* the line. So we buffer inline runs and flush them
// whenever a newline is seen, applying that newline's attributes to the line.

function parseDelta (delta) {
  const ops = (delta && delta.ops) || []
  const lines = []
  let runs = []

  const flush = (attrs = {}) => {
    lines.push({
      runs,
      header: attrs.header || 0,
      list: attrs.list || null,
      blockquote: !!attrs.blockquote,
      codeBlock: !!attrs['code-block'],
      indent: attrs.indent || 0
    })
    runs = []
  }

  for (const op of ops) {
    if (typeof op.insert !== 'string') continue // embeds (images) are skipped
    const attrs = op.attributes || {}
    const pieces = op.insert.split('\n')

    pieces.forEach((piece, i) => {
      if (piece) {
        runs.push({
          text: piece,
          bold: !!attrs.bold,
          italic: !!attrs.italic,
          underline: !!attrs.underline,
          strike: !!attrs.strike,
          code: !!attrs.code,
          link: attrs.link || null
        })
      }
      // Every split boundary except the last represents a real newline.
      if (i < pieces.length - 1) flush(attrs)
    })
  }

  if (runs.length) flush()

  // Drop a single trailing empty line (Quill always ends with one).
  while (lines.length && !lines[lines.length - 1].runs.length &&
         !lines[lines.length - 1].header && !lines[lines.length - 1].list) {
    lines.pop()
  }
  return lines
}

// --- HTML --------------------------------------------------------------------

function escapeHtml (text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function runsToHtml (runs) {
  return runs.map(run => {
    let html = escapeHtml(run.text)
    if (run.code) html = `<code>${html}</code>`
    if (run.bold) html = `<strong>${html}</strong>`
    if (run.italic) html = `<em>${html}</em>`
    if (run.underline) html = `<u>${html}</u>`
    if (run.strike) html = `<s>${html}</s>`
    if (run.link) html = `<a href="${escapeHtml(run.link)}">${html}</a>`
    return html
  }).join('')
}

function toHtml (delta, title) {
  const lines = parseDelta(delta)
  const body = []
  let openList = null

  const closeList = () => {
    if (openList) { body.push(`</${openList}>`); openList = null }
  }

  for (const line of lines) {
    const content = runsToHtml(line.runs)

    if (line.list) {
      const tag = line.list === 'ordered' ? 'ol' : 'ul'
      if (openList !== tag) { closeList(); body.push(`<${tag}>`); openList = tag }
      body.push(`  <li>${content}</li>`)
      continue
    }
    closeList()

    if (line.header) body.push(`<h${line.header}>${content}</h${line.header}>`)
    else if (line.blockquote) body.push(`<blockquote>${content}</blockquote>`)
    else if (line.codeBlock) body.push(`<pre><code>${content}</code></pre>`)
    else if (!content) body.push('<p>&nbsp;</p>')
    else body.push(`<p>${content}</p>`)
  }
  closeList()

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.6;
    max-width: 42em;
    margin: 3em auto;
    padding: 0 1.5em;
    color: #1a1a1a;
  }
  p { margin: 0 0 0.85em; }
  h1, h2, h3 { line-height: 1.3; margin: 1.4em 0 0.5em; }
  blockquote {
    margin: 0 0 0.85em; padding-left: 1em;
    border-left: 3px solid #ddd; color: #555;
  }
  pre { background: #f5f5f5; padding: 0.75em 1em; overflow-x: auto; }
</style>
</head>
<body>
${body.join('\n')}
</body>
</html>
`
}

// --- Markdown ----------------------------------------------------------------

function runsToMarkdown (runs) {
  return runs.map(run => {
    let text = run.text
    if (run.code) return `\`${text}\``
    // Escape characters that would otherwise create accidental formatting.
    text = text.replace(/([*_`[\]])/g, '\\$1')
    if (run.bold && run.italic) text = `***${text}***`
    else if (run.bold) text = `**${text}**`
    else if (run.italic) text = `*${text}*`
    if (run.strike) text = `~~${text}~~`
    if (run.link) text = `[${text}](${run.link})`
    return text
  }).join('')
}

function toMarkdown (delta, title) {
  const lines = parseDelta(delta)
  const out = []
  let orderedIndex = 0
  let inCodeBlock = false
  let prevList = null

  for (const line of lines) {
    const content = runsToMarkdown(line.runs)
    const indent = '  '.repeat(line.indent || 0)

    // A list must be separated from what follows (and from a list of the other
    // kind) by a blank line, or parsers fold the next block into the last item.
    if (prevList && prevList !== line.list) out.push('')
    if (line.list === 'ordered' && prevList !== 'ordered') orderedIndex = 0
    prevList = line.list

    if (line.codeBlock) {
      if (!inCodeBlock) { out.push('```'); inCodeBlock = true }
      // Code content is emitted raw, without Markdown escaping.
      out.push(line.runs.map(r => r.text).join(''))
      continue
    }
    if (inCodeBlock) { out.push('```', ''); inCodeBlock = false }

    if (line.list === 'ordered') {
      orderedIndex += 1
      out.push(`${indent}${orderedIndex}. ${content}`)
      continue
    }

    if (line.list === 'bullet') out.push(`${indent}- ${content}`)
    else if (line.header) out.push('', `${'#'.repeat(line.header)} ${content}`, '')
    else if (line.blockquote) out.push(`> ${content}`, '')
    else if (!content) out.push('')
    else out.push(content, '')
  }
  if (inCodeBlock) out.push('```')

  // Collapse runs of blank lines down to one.
  const body = out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return `# ${title}\n\n${body}\n`
}

// --- DOCX --------------------------------------------------------------------

const HEADING_FOR = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3
}

function runsToDocx (runs) {
  return runs.map(run => {
    const textRun = new TextRun({
      text: run.text,
      bold: run.bold,
      italics: run.italic,
      underline: run.underline ? {} : undefined,
      strike: run.strike,
      font: run.code ? 'Consolas' : undefined
    })
    return run.link
      ? new ExternalHyperlink({ children: [textRun], link: run.link })
      : textRun
  })
}

async function toDocxBuffer (delta, title) {
  const lines = parseDelta(delta)
  const paragraphs = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE })
  ]

  for (const line of lines) {
    const children = runsToDocx(line.runs)
    const options = { children }

    if (line.header && HEADING_FOR[line.header]) {
      options.heading = HEADING_FOR[line.header]
    } else if (line.list === 'bullet') {
      options.bullet = { level: line.indent || 0 }
    } else if (line.list === 'ordered') {
      options.numbering = { reference: 'cadence-ordered', level: line.indent || 0 }
    } else if (line.blockquote) {
      options.indent = { left: convertInchesToTwip(0.5) }
      options.spacing = { after: 160 }
    } else if (line.codeBlock) {
      options.spacing = { after: 0 }
    } else {
      options.spacing = { after: 160 }   // ~8pt, matching the editor's rhythm
    }

    paragraphs.push(new Paragraph(options))
  }

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'cadence-ordered',
        levels: [0, 1, 2].map(level => ({
          level,
          format: LevelFormat.DECIMAL,
          text: `%${level + 1}.`,
          alignment: AlignmentType.START,
          style: {
            paragraph: {
              indent: {
                left: convertInchesToTwip(0.5 * (level + 1)),
                hanging: convertInchesToTwip(0.25)
              }
            }
          }
        }))
      }]
    },
    styles: {
      default: {
        document: {
          run: { font: 'Georgia', size: 24 }   // size is half-points => 12pt
        }
      }
    },
    sections: [{
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      children: paragraphs
    }]
  })

  return Packer.toBuffer(doc)
}

// --- Import ------------------------------------------------------------------
// Turns pasted plain text into a Delta. Blank lines become empty paragraphs so
// the shape of the original is preserved.

function textToDelta (text) {
  const normalised = String(text || '').replace(/\r\n?/g, '\n')
  const ops = []
  for (const line of normalised.split('\n')) {
    if (line) ops.push({ insert: line })
    ops.push({ insert: '\n' })
  }
  if (!ops.length) ops.push({ insert: '\n' })
  return { ops }
}

function countWords (text) {
  const trimmed = String(text || '').trim()
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0
}

module.exports = {
  parseDelta, toHtml, toMarkdown, toDocxBuffer, textToDelta, countWords
}
