import { NextFunction, Request, Response } from "express";
import { ValidationError } from "../../packages/error-handlers/index";
import prisma from "../../packages/libs/prisma";
import {
  checkOtpRegistrations,
  sendOtp,
  trackOtpRequest,
  validateRegistrationData,
} from "../../utils/auth.helper";

export const userRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    validateRegistrationData(req.body, "admin");
    const { name, email } = req.body;
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return next(new ValidationError("User already exist with this email!"));
    }

    await checkOtpRegistrations(email, next);
    await trackOtpRequest(email, next);
    await sendOtp(name, email, "welcome.html");
    res.status(200).json({
      message: "OTP sent to email. please verify your account.",
    });
  } catch (error) {
    return next(error);
  }
};

export const generate_receipt = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ValidationError("Missing required fields!"));
    }
  } catch (error) {
    return next(error);
  }
};
