import mustache from "mustache";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EmailTemplateData {
  [key: string]: any;
}

export const EmailTemplateData = (
  templateName: string,
  data: EmailTemplateData
): string | undefined => {
  try {
    const templatePath: string = path.join(
      __dirname,
      `../template/${templateName}`
    );
    const content: string = fs.readFileSync(templatePath, "utf-8");
    const output: string = mustache.render(content, data);
    return output;
  } catch (error) {
    console.log({ error });
    return;
  }
};
