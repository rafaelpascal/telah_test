// Mock QRCode to avoid image decoding errors in tests
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

  // ✅ Success Path
  it("should return a Buffer", async () => {
    const pdfBuffer = await generate_pdf(sampleData);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
  }, 10000);

  it("should generate a non-empty PDF buffer", async () => {
    const pdfBuffer = await generate_pdf(sampleData);
    expect(pdfBuffer.length).toBeGreaterThan(100);
  }, 10000);

  // ✅ Edge Case
  it("should generate PDF even with empty data values", async () => {
    const minimalData: ReceiptData = {
      receiptId: "",
      payerName: "",
      amount: 0,
      currency: "",
      paymentDate: new Date().toISOString(),
    };

    const pdfBuffer = await generate_pdf(minimalData);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(100);
  }, 10000);

  // ✅ Failure Case
  it("should throw an error if called with invalid input", async () => {
    // @ts-expect-error: simulate bad input
    await expect(generate_pdf(undefined)).rejects.toThrow();
  });

  // ✅ Optional: simulate QR generation failure
  it("should throw if QR code generation fails", async () => {
    jest.resetModules();
    jest.doMock("qrcode", () => ({
      toDataURL: async () => {
        throw new Error("QR failed");
      },
    }));

    const { generate_pdf: brokenPdf } = await import(
      "../src/services/pdf.service"
    );

    // Must temporarily override NODE_ENV to avoid QR skip logic
    process.env.NODE_ENV = "production";

    await expect(brokenPdf(sampleData)).rejects.toThrow("QR failed");
  });
});
