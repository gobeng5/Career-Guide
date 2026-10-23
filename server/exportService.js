import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from 'docx';

const FONT = 'Calibri';
const INK = '1F1F1F';

// Splits "**bold**" markers into bold runs
function inlineRuns(text) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**') && part.endsWith('**')
        ? new TextRun({ text: part.slice(2, -2), bold: true })
        : new TextRun({ text: part })
    );
}

/**
 * Creates a formatted DOCX buffer from plain text or light markdown.
 * Consecutive lines form a block (e.g. an address) with no gap between them;
 * blank lines separate blocks. The optional title is only added when given,
 * since resumes and letters already carry their own heading.
 */
export async function createDocxBuffer(title, content) {
  const children = [];

  if (title) {
    children.push(new Paragraph({ children: inlineRuns(title), heading: HeadingLevel.HEADING_1 }));
  }

  const lines = content.replace(/\r\n?/g, '\n').split('\n');

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const nextBlank = i + 1 >= lines.length || !lines[i + 1].trim();
    const after = nextBlank ? 200 : 0;

    if (trimmed.startsWith('# ')) {
      children.push(new Paragraph({ children: inlineRuns(trimmed.slice(2)), heading: HeadingLevel.HEADING_1 }));
    } else if (trimmed.startsWith('## ')) {
      children.push(
        new Paragraph({
          children: inlineRuns(trimmed.slice(3)),
          heading: HeadingLevel.HEADING_2,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'A6A6A6', space: 2 } }
        })
      );
    } else if (trimmed.startsWith('### ')) {
      children.push(new Paragraph({ children: inlineRuns(trimmed.slice(4)), heading: HeadingLevel.HEADING_3 }));
    } else if (/^[-*•]\s+/.test(trimmed)) {
      children.push(
        new Paragraph({
          children: inlineRuns(trimmed.replace(/^[-*•]\s+/, '')),
          bullet: { level: 0 },
          spacing: { after: nextBlank ? 160 : 40 }
        })
      );
    } else {
      children.push(new Paragraph({ children: inlineRuns(trimmed), spacing: { after } }));
    }
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22, color: INK },
          paragraph: { spacing: { line: 276 } }
        },
        heading1: {
          run: { font: FONT, size: 32, bold: true, color: '000000' },
          paragraph: { spacing: { after: 60 } }
        },
        heading2: {
          run: { font: FONT, size: 22, bold: true, color: '000000' },
          paragraph: { spacing: { before: 280, after: 100 } }
        },
        heading3: {
          run: { font: FONT, size: 22, italics: true, color: '404040' },
          paragraph: { spacing: { before: 160, after: 60 } }
        }
      }
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } // 2 cm
        },
        children
      }
    ]
  });

  return await Packer.toBuffer(doc);
}
