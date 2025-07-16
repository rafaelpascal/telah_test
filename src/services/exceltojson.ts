import * as XLSX from "xlsx";
import fs from "fs";

type StaffInfo = {
  email: string;
  name: string;
};

export const excelToJson = (filePath: string): StaffInfo[] => {
  const buffer = fs.readFileSync(filePath); // read file into buffer
  const workbook = XLSX.read(buffer, { type: "buffer" }); // use XLSX.read, not readFile
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<StaffInfo>(sheet);
  return jsonData;
};
