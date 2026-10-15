import { createRequire } from 'module';
import mammoth from 'mammoth';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export async function parseDocument(fileBuffer, originalName, mimeType) {
  const extension = (originalName || '').split('.').pop().toLowerCase();

  try {
    if (extension === 'pdf' || mimeType === 'application/pdf') {
      const data = await pdfParse(fileBuffer);
      return cleanExtractedText(data.text);
    }

    if (extension === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return cleanExtractedText(result.value);
    }

    if (extension === 'txt' || extension === 'md' || mimeType?.startsWith('text/')) {
      return cleanExtractedText(fileBuffer.toString('utf-8'));
    }

    // Default fallback to text decode
    return cleanExtractedText(fileBuffer.toString('utf-8'));
  } catch (error) {
    console.error('Error parsing document:', error);
    // If pdf-parse or mammoth failed, try plain text fallback
    try {
      const fallback = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, '');
      if (fallback.length > 50) return cleanExtractedText(fallback);
    } catch {
      // ignore
    }
    throw new Error(`Failed to extract text from file (${extension}): ${error.message}`);
  }
}

function cleanExtractedText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

