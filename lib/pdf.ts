export async function parsePdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const header = buffer.slice(0, 4).toString();
  if (header !== "%PDF") {
    throw new Error("文件不是有效的 PDF 格式");
  }

  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);

  const text = data.text.trim();
  if (!text) {
    throw new Error("PDF 中未提取到文字内容");
  }

  return text;
}

export async function parseUploadedFiles(
  files: { field: string; file: File }[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const { field, file } of files) {
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      result[field] = await parsePdf(file);
    } else {
      result[field] = await file.text();
    }
  }

  return result;
}
