import express, { Router } from "express";
import {
  sendEmail,
  saveReport,
  getallReport,
} from "../controls/message.controls";
import multer from "multer";
import { authenticate } from "../packages/middlewares/authenticate";
const upload = multer({ storage: multer.memoryStorage() });

const router: Router = express.Router();

router.post("/user-send-email", authenticate, upload.single("file"), sendEmail);
router.post("/save-report", saveReport);
router.get("/message-reports", authenticate, getallReport);

export default router;
