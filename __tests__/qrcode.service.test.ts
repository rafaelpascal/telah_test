import QRCode from "qrcode";

describe("QRCode Generator", () => {
  const payload = {
    receiptId: "RCP123456",
    generatedAt: new Date().toISOString(),
  };

  it("should generate a valid base64 PNG QR code", async () => {
    const qrString = JSON.stringify(payload);
    const dataUrl = await QRCode.toDataURL(qrString);

    expect(dataUrl).toMatch(/^data:image\/png;base64,/); // basic format check
    const base64Data = dataUrl.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    // Ensure the buffer has content
    expect(buffer.length).toBeGreaterThan(100); // basic sanity check
  });
});
