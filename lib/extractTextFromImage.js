export async function extractTextFromImage(file) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("ind+eng");

  try {
    const {
      data: { text },
    } = await worker.recognize(file);

    return text.replace(/\s+\n/g, "\n").trim();
  } finally {
    await worker.terminate();
  }
}
