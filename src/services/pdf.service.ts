import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { ReceiptData } from "../utils/types";

/**
 * Generates a PDF receipt with embedded QR code.
 *
 * @param data - Receipt data, containing {receiptId, payerName, amount, currency, paymentDate}
 * @returns A Promise that resolves to a Buffer containing the PDF data
 */

export const generate_pdf = async (data: ReceiptData): Promise<Buffer> => {
  const doc = new PDFDocument();
  const buffers: Uint8Array[] = [];

  doc.on("data", buffers.push.bind(buffers));

  doc.fontSize(16).text(`Receipt ID: ${data.receiptId}`);
  doc.text(`Name: ${data.payerName}`);
  doc.text(`Amount: ${data.currency} ${data.amount}`);
  doc.text(`Date: ${new Date(data.paymentDate).toLocaleString()}`);

  if (process.env.NODE_ENV !== "test") {
    const qrString = JSON.stringify({
      receiptId: data.receiptId,
      generatedAt: new Date().toISOString(),
    });

    const qrImage = await QRCode.toDataURL(qrString);
    const base64Data = qrImage.replace(/^data:image\/png;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, "base64");

    doc.image(imgBuffer, { width: 100, align: "center" });
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
  });
};
