jest.mock("qrcode", () => ({
  toDataURL: async () =>
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Yl04zQAAAAASUVORK5CYII=",
}));

import { generate_pdf } from "../src/services/pdf.service";
import { ReceiptData } from "../src/utils/types";

describe("generate_pdf", () => {
  const sampleData: ReceiptData = {
    receiptId: "RCP123456",
    payerName: "Raphael Emehelu",
    amount: 15000,
    currency: "NGN",
    paymentDate: new Date().toISOString(),
  };

  it("should return a Buffer", async () => {
    const pdfBuffer = await generate_pdf(sampleData);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
  }, 10000); // increase timeout

  it("should generate a non-empty PDF buffer", async () => {
    const pdfBuffer = await generate_pdf(sampleData);
    expect(pdfBuffer.length).toBeGreaterThan(100);
  }, 10000); // increase timeout
});
