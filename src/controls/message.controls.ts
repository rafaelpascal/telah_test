import { Request, Response } from "express";
import fs from "fs";
import { Producer } from "../services/producer";
import { excelToJson } from "../services/exceltojson";

export const sendEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const filePath = (req as Request & { file?: Express.Multer.File }).file
      ?.path;
    if (!filePath) {
      res.status(400).json({ error: "No file uploaded" });
      return;
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
    console.error("Error in sendEmail:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};
