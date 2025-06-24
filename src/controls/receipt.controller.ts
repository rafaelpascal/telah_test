import { NextFunction, Request, Response } from "express";
import { generate_pdf } from "../services/pdf.service";
import { ValidationError } from "../packages/error-handlers/index";

/**
 * Handles HTTP requests to generate a receipt PDF.
 *
 * This function extracts receipt data from the request body, validates the
 * presence of required fields, and generates a PDF receipt using the `generate_pdf`
 * service. The generated PDF is sent back to the client as an attachment.
 *
 * @param req - The express Request object containing the receipt data in the body.
 * @param res - The express Response object used to send back the PDF.
 * @param next - The NextFunction callback for error handling.
 *
 * Throws a ValidationError if any required fields are missing.
 */

export const generate_receipt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { receiptId, payerName, amount, currency, paymentDate } = req.body;

    if (!receiptId || !payerName || !amount || !currency || !paymentDate) {
      return next(new ValidationError("Missing required fields!"));
    }

    const receiptData = { receiptId, payerName, amount, currency, paymentDate };
    const pdfBuffer = await generate_pdf(receiptData);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${receiptData.receiptId}.pdf`,
    });

    res.send(pdfBuffer);
  } catch (error) {
    return next(error);
  }
};
