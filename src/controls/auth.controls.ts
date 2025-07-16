import { NextFunction, Request, Response } from "express";
import {
  AuthenticationError,
  ValidationError,
} from "../packages/error-handlers/index";
import prisma from "../packages/libs/prisma";
import {
  checkOtpRegistrations,
  emailRegex,
  sendOtp,
  trackOtpRequest,
  validateRegistrationData,
  verifyOtp,
} from "../utils/auth.helper";
import jwt from "jsonwebtoken";
import { setCookie } from "../utils/cookies/setCookie";
import bcrypt from "bcryptjs";

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
    const otpsent = await sendOtp(name, email, "welcome.html");
    console.log(otpsent);

    res.status(200).json({
      message: "OTP sent to email. please verify your account.",
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyUserRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, name, otp } = req.body;
    if (!email || !password || !name || !otp) {
      return next(new ValidationError("Missing required fields!"));
    }
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return next(new ValidationError("User already exist with this email!"));
    }
    await verifyOtp(email, otp, next);
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });
    res.status(201).json({
      status: "success",
      message: "User registered successfully!",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const userLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ValidationError("Email and password are required!"));
    }
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return next(new AuthenticationError("User does not exist!"));
    }
    const isPasswordValid = await bcrypt.compare(password, user.password!);
    if (!isPasswordValid) {
      return next(new AuthenticationError("Invalid password!"));
    }
    //  generate access and refresh tokens here
    const accessToken = jwt.sign(
      { id: user.id, role: "user" },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: user.id, role: "user" },
      process.env.REFRESH_TOKEN_SECRET as string,
      { expiresIn: "7d" }
    );
    // store the refresh token and access token in an httpOnly secure cookie
    setCookie(res, "refresh_token", refreshToken);
    setCookie(res, "access_token", accessToken);
    res.status(200).json({
      message: "Login successful",
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    return next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      throw new ValidationError("Unauthorized! Refresh token not found!");
    }
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as { id: string; role: string };

    if (!decoded || !decoded.id || !decoded.role) {
      throw new Error("Forbidden! Invalid refresh token!");
    }

    const user = await prisma.users.findUnique({ where: { id: decoded.id } });

    if (!user) {
      throw new AuthenticationError("Forbidden! User not found!");
    }

    const accessToken = jwt.sign(
      { id: user.id, role: "user" },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: "15m" }
    );
    setCookie(res, "access_token", accessToken);
    res.status(201).json({
      success: true,
      message: "Token refreshed successfully!",
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    return next(error);
  }
};
