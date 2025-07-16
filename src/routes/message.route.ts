import express, { Router } from "express";
import {
  sendEmail,
  saveReport,
  getallReport,
} from "../controls/message.controls";
import multer from "multer";
const upload = multer({ dest: "uploads/" });

const router: Router = express.Router();

router.post("/user-send-email", upload.single("file"), sendEmail);
router.post("/save-report", saveReport);
router.post("/message-reports", getallReport);

export default router;
