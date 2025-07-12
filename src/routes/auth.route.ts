import express, { Router } from "express";
import { userRegistration } from "../controls/auth/auth.controls";

const router: Router = express.Router();

router.post("/user-registration", userRegistration);

export default router;
