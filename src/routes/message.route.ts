import express, { Router } from "express";
import { sendEmail } from "../controls/message.controls";
import multer from "multer";
const upload = multer({ dest: "uploads/" });

const router: Router = express.Router();

router.post("/user-send-email", upload.single("file"), sendEmail);

export default router;
