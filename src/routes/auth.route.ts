import express, { Router } from "express";
import {
  userRegistration,
  verifyUserRegistration,
  userLogin,
  refreshToken,
} from "../controls/auth.controls";

const router: Router = express.Router();

router.post("/user-registration", userRegistration);
router.post("/verify-user-registration", verifyUserRegistration);
router.post("/user-login", userLogin);
router.post("/refresh-token", refreshToken);

export default router;
