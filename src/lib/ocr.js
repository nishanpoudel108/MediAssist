import Tesseract from 'tesseract.js';

// Extract text from an uploaded image/scan using Tesseract OCR.
// For PDFs, production would rasterize pages first (e.g. pdf.js) then OCR each page.
export async function extractTextFromImage(file) {
  if (!file) return '';
  try {
    const { data } = await Tesseract.recognize(file, 'eng', {
      logger: () => {},
    });
    return data.text || '';
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('OCR failed:', err);
    throw new Error('Could not extract text from the image.');
  }
}
