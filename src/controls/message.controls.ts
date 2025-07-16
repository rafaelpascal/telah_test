import { NextFunction, Request, Response } from "express";
import fs from "fs";
import { Producer } from "../services/producer";
import { excelToJson } from "../services/exceltojson";
import { ValidationError } from "../packages/error-handlers";
import prisma from "../packages/libs/prisma";

/**
 * Send Email
 * @description Send an email to the selected staff members, with the given batch and window size
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @param {NextFunction} next - Express NextFunction callback
 * @returns {Promise<void>} - Promise with the response data
 */

export const sendEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filePath = (req as Request & { file?: Express.Multer.File }).file
      ?.path;
    if (!filePath) {
      return next(
        new ValidationError(
          "Select the an excel file to with the proper format!"
        )
      );
    }

    const jsonResult = excelToJson(filePath);
    fs.writeFileSync(
      "output.json",
      JSON.stringify(jsonResult, null, 2),
      "utf-8"
    );

    const batchNumber = parseInt(req.body.batch) || 1;
    const windowSize = parseInt(req.body.window) || 5000;

    const start = batchNumber * windowSize - windowSize;
    const end = batchNumber * windowSize;
    const batch = `Batch ${batchNumber}`;
    const window = `Window ${windowSize}`;
    const sendStaff = jsonResult.slice(start, end);
    const results: {
      email: string;
      name: string;
      status: string;
      error?: string;
    }[] = [];

    for (const staffInfo of sendStaff) {
      const email = staffInfo.email;
      const name = `${staffInfo.name}`;
      try {
        results.push({ email, name, status: "sent" });
      } catch (error: any) {
        results.push({ email, name, status: "failed", error: error.message });
      }
    }

    const routingKey =
      "imdqKn26vi5SNAZI1l9PsePPMRGOcaWFHOFLG4wsXlkvryYMMU1VKKMD3LYjVnMYCwSmSMAK5ZNhCynfoIlBxgiGTf6XclsNPyBVGkWdLlDi6VGSgyGsfbAHqG8QL4da90dnC9x9kZQ4uUdKuKreWGWix9lelb9klVnW6IHMBHnsibHvkxKTsGE7vpoOh7wauuWdIIJOEwtaUoQOhnfAtOSPn7w7uyg3EJpXLl9oLqTLRvFktMIgad9nfonl8aX";

    const producer = new Producer();
    await producer.publishMessage(routingKey, results, batch, window);

    res.status(200).json({ message: "Emails processed", data: results });
  } catch (error: any) {
    return next(error);
  }
};
/**
 * Save a report of a message delivery
 * @param req - The HTTP request object
 * @param res - The HTTP response object
 * @param next - The next middleware function in the stack
 * @returns A promise that resolves to nothing
 */

export const saveReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sender, recipient, send_message, status } = req.body;
    if (!sender || !recipient || !send_message || !status) {
      new ValidationError("Missing required fields!");
    }
    const report = await prisma.messageReport.create({
      data: {
        sender,
        recipient,
        send_message,
        status,
      },
    });

    res.status(201).json({ success: true, data: report });
  } catch (error: any) {
    return next(error);
  }
};

export const getallReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reports = await prisma.messageReport.findMany({});
    res.status(200).json({ success: true, data: reports });
  } catch (error: any) {
    return next(error);
  }
};
