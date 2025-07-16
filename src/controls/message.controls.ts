import { NextFunction, Request, Response } from "express";
import fs from "fs";
import { Producer } from "../services/producer";
import { excelToJson } from "../services/exceltojson";
import {
  AuthenticationError,
  ValidationError,
} from "../packages/error-handlers";
import prisma from "../packages/libs/prisma";

/**
 * Send Email
 * @description Send an email to the selected staff members, with the given batch and window size
 * @param {Request} req - Express Request object
 * @param {Response} res - Express Response object
 * @param {NextFunction} next - Express NextFunction callback
 * @returns {Promise<void>} - Promise with the response data
 */

// export const sendEmail = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const fileBuffer = (req as Request & { file?: Express.Multer.File }).file
//       ?.buffer;

//     if (!fileBuffer) {
//       return next(
//         new ValidationError("Select an Excel file with the proper format!")
//       );
//     }

//     const userId = (req as any).user?.id;
//     if (!userId) {
//       return next(
//         new AuthenticationError(
//           "Forbidden: You are not authorized to access this resource!"
//         )
//       );
//     }

//     const jsonResult = excelToJson(fileBuffer);
//     fs.writeFileSync(
//       "output.json",
//       JSON.stringify(jsonResult, null, 2),
//       "utf-8"
//     );

//     const batchNumber = parseInt(req.body.batch) || 1;
//     const windowSize = parseInt(req.body.window) || 5000;

//     const start = batchNumber * windowSize - windowSize;
//     const end = batchNumber * windowSize;
//     const batch = `Batch ${batchNumber}`;
//     const window = `Window ${windowSize}`;
//     const sendStaff = jsonResult.slice(start, end);
//     const results: {
//       email: string;
//       name: string;
//       status: string;
//       error?: string;
//     }[] = [];

//     for (const staffInfo of sendStaff) {
//       const email = staffInfo.email;
//       const name = `${staffInfo.name}`;
//       try {
//         results.push({ email, name, status: "sent" });
//       } catch (error: any) {
//         results.push({ email, name, status: "failed", error: error.message });
//       }
//     }

//     const routingKey =
//       "imdqKn26vi5SNAZI1l9PsePPMRGOcaWFHOFLG4wsXlkvryYMMU1VKKMD3LYjVnMYCwSmSMAK5ZNhCynfoIlBxgiGTf6XclsNPyBVGkWdLlDi6VGSgyGsfbAHqG8QL4da90dnC9x9kZQ4uUdKuKreWGWix9lelb9klVnW6IHMBHnsibHvkxKTsGE7vpoOh7wauuWdIIJOEwtaUoQOhnfAtOSPn7w7uyg3EJpXLl9oLqTLRvFktMIgad9nfonl8aX";

//     const producer = new Producer();
//     await producer.publishMessage(routingKey, results, batch, window);

//     res.status(200).json({ message: "Emails processed", data: results });
//   } catch (error: any) {
//     return next(error);
//   }
// };

export const sendEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as {
      excel?: Express.Multer.File[];
      html?: Express.Multer.File[];
    };

    const excelFile = files?.excel?.[0];
    const htmlFile = files?.html?.[0];

    if (!excelFile?.buffer) {
      return next(new ValidationError("Please upload a valid Excel file!"));
    }

    if (!htmlFile?.buffer) {
      return next(new ValidationError("Please upload a valid HTML file!"));
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return next(new AuthenticationError("Unauthorized user!"));
    }

    // ✅ Parse Excel buffer
    const jsonResult = excelToJson(excelFile.buffer);

    // ✅ Get HTML content from buffer
    const htmlTemplate = htmlFile.buffer.toString("utf-8");

    // Optional: Remove this in production
    // fs.writeFileSync("output.json", JSON.stringify(jsonResult, null, 2), "utf-8");

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
        // In real use: personalize the HTML before sending
        const personalizedHtml = htmlTemplate.replace("{{name}}", name);

        // Send email using your email service
        // await sendEmailToUser(email, personalizedHtml, subject);

        results.push({ email, name, status: "sent" });
      } catch (error: any) {
        results.push({ email, name, status: "failed", error: error.message });
      }
    }

    const routingKey =
      "imdqKn26vi5SNAZI1l9PsePPMRGOcaWFHOFLG4wsXlkvryYMMU1VKKMD3LYjVnMYCwSmSMAK5ZNhCynfoIlBxgiGTf6XclsNPyBVGkWdLlDi6VGSgyGsfbAHqG8QL4da90dnC9x9kZQ4uUdKuKreWGWix9lelb9klVnW6IHMBHnsibHvkxKTsGE7vpoOh7wauuWdIIJOEwtaUoQOhnfAtOSPn7w7uyg3EJpXLl9oLqTLRvFktMIgad9nfonl8aX";
    const producer = new Producer();
    await producer.publishMessage(
      routingKey,
      results,
      batch,
      window,
      htmlTemplate
    );
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
    const userId = (req as any).user;
    console.log("bbbbbbbbb", userId);

    if (!userId) {
      return next(
        new AuthenticationError(
          "Forbidden: You are not authorized to access this resource!"
        )
      );
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

/**
 * Retrieves all message reports from the database.
 *
 * This function checks for user authorization and fetches all message reports
 * from the database. If the user is not authorized, it returns an authentication
 * error. If the operation is successful, it responds with an array of message
 * reports.
 *
 * @param req - The HTTP request object containing user information.
 * @param res - The HTTP response object used to send back the reports.
 * @param next - The next middleware function for error handling.
 * @returns A promise that resolves to nothing.
 *
 * Throws an AuthenticationError if the user is not authorized.
 */

export const getallReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return next(
        new AuthenticationError(
          "Forbidden: You are not authorized to access this resource!"
        )
      );
    }

    const reports = await prisma.messageReport.findMany({});
    res.status(200).json({ success: true, data: reports });
  } catch (error: any) {
    return next(error);
  }
};
