import crypto from "crypto";
import { ValidationError } from "../packages/error-handlers";
import redis from "../packages/libs/redis";
import { sendEmail } from "./sendmail";
import { NextFunction, Request, Response } from "express";
import prisma from "../packages/libs/prisma";
import bcrypt from "bcryptjs";
import { EmailTemplateData } from "./sendmail/make-template";

// Assume getSettingValue returns a Promise<string>
async function getSettingValue(key: string): Promise<string> {
  // dummy implementation, replace with actual one
  return "30";
}

interface TokenData {
  token: string;
  hashedToken: string;
  expirationDate: Date;
}

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const generaeToken = async (): Promise<TokenData> => {
  const tokenExpirationString = await getSettingValue("tokenexpiration");
  const tokenExpiration = parseInt(tokenExpirationString, 10);

  if (isNaN(tokenExpiration)) {
    throw new Error("Invalid token expiration value");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + tokenExpiration);

  const hashedToken = await bcrypt.hash(token, 10);

  return { token, hashedToken, expirationDate };
};

export const validateRegistrationData = (
  data: any,
  userType: "user" | "admin"
) => {
  const { name, email, password, phone_number } = data;

  if (!name || !email || !password || !phone_number) {
    throw new ValidationError(`Missing required fields!`);
  }

  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format!");
  }
};

export const checkOtpRegistrations = async (
  email: string,
  next: NextFunction
) => {
  if (await redis.get(`otp_lock:${email}`)) {
    return next(
      new ValidationError(
        "Account locked due to multiple failed attempts! Try again after 30 minutes"
      )
    );
  }

  if (await redis.get(`otp_spam_lock:${email}`)) {
    return next(
      new ValidationError("Too many OTP requests! Try again after 1 hour!")
    );
  }

  if (await redis.get(`otp_cooldown:${email}`)) {
    return next(
      new ValidationError("Please wait 1 minute before requesting a new OTP")
    );
  }
};

export const trackOtpRequest = async (email: string, next: NextFunction) => {
  const otpRequestKey = `otp_request_count:${email}`;
  let otpRequests = parseInt((await redis.get(otpRequestKey)) || "0");

  if (otpRequests >= 2) {
    await redis.set(`otp_spam_lock:${email}`, "locked", "EX", 3600);
    throw new ValidationError(
      "Too many OTP Request. please wait 1 hour before requesting again."
    );
  }

  await redis.set(otpRequestKey, otpRequests + 1, "EX", 3600);
};
export const sendOtp = async (
  name: string,
  email: string,
  template: string
) => {
  try {
    const { token, expirationDate } = await generaeToken();

    const expirydateTime = new Date(expirationDate);

    // Prepare and send email with the token
    const mailData = {
      token,
      name: `${name}`,
      expiry: `${expirydateTime}`,
      year: new Date().getFullYear(),
    };

    const message = EmailTemplateData(template, mailData);
    const subject = `Verify Your Email`;
    await sendEmail(email, message, subject);
    await redis.set(`otp:${email}`, token, "EX", 300);
    await redis.set(`otp_cooldown: ${email}`, "true", "EX", 60);
  } catch (error) {
    console.log(error);
  }
};

export const verifyOtp = async (
  email: string,
  otp: string,
  next: NextFunction
) => {
  const storedOtp = await redis.get(`otp:${email}`);
  if (!storedOtp) {
    throw new ValidationError("Invalid or expired!");
  }
  const failedAttemptsKey = `otp_lock:${email}`;
  const failedAttempts = parseInt((await redis.get(failedAttemptsKey)) || "0");
  if (storedOtp !== otp) {
    if (failedAttempts >= 2) {
      await redis.set(`otp_lock:${email}`, "locked", "EX", 1800); // Lock for 30 minutes
      await redis.del(`otp:${email}`, failedAttemptsKey);
      throw new ValidationError(
        "Too many failed attempts, your account is locked for 30 minutes!"
      );
    }
    await redis.set(failedAttemptsKey, failedAttempts + 1, "EX", 300);
    throw new ValidationError(
      `Incorrect OTP. ${2 - failedAttempts} attempts left!`
    );
  }
  await redis.del(`otp:${email}`, failedAttemptsKey);
};

// export const handleForgotPassword = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
//   userType: "user" | "seller"
// ) => {
//   try {
//     const { email } = req.body;
//     if (!email) {
//       throw new ValidationError("Email is required!");
//     }
//     if (!emailRegex.test(email)) {
//       return next(new ValidationError("Invalid email format!"));
//     }
//     const user =
//       userType === "user"
//         ? await prisma.users.findUnique({ where: { email } })
//         : await prisma.seller.findUnique({ where: { email } });
//     if (!user) {
//       throw new ValidationError(`${userType} does not exist with this email!`);
//     }
//     await checkOtpRegistrations(email, next);
//     await trackOtpRequest(email, next);
//     await sendOtp(
//       user.name,
//       email,
//       userType === "user" ? "user-forgot-mail" : "seller-forgot-mail"
//     );
//     res.status(200).json({ message: "OTP sent successfully!" });
//   } catch (error) {
//     next(error);
//   }
// };

export const verifyForgotPasswordOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return next(new ValidationError("Email and OTP are required!"));
    }
    if (!emailRegex.test(email)) {
      return next(new ValidationError("Invalid email format!"));
    }
    await verifyOtp(email, otp, next);
    res.status(200).json({
      message: "OTP verified successfully, you can now reset your password!",
    });
  } catch (error) {
    next(error);
  }
};
