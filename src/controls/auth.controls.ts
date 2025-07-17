import { NextFunction, Request, Response } from "express";
import {
  AuthenticationError,
  ValidationError,
} from "../packages/error-handlers/index";
import prisma from "../packages/libs/prisma";
import {
  checkOtpRegistrations,
  sendOtp,
  trackOtpRequest,
  validateRegistrationData,
  verifyOtp,
} from "../utils/auth.helper";
import jwt from "jsonwebtoken";
import { setCookie } from "../utils/cookies/setCookie";
import bcrypt from "bcryptjs";

/**
 * Handles user registration by validating input data, checking for existing users,
 * and sending an OTP to the provided email for verification.
 *
 * This function first validates the registration data for required fields such as
 * name and email. It checks if a user with the given email already exists in the
 * database. If the user does not exist, it proceeds to check OTP registration
 * constraints and sends an OTP email to the user for account verification.
 *
 * @param req - The HTTP request object containing registration data in the body.
 * @param res - The HTTP response object used to send the status of the registration process.
 * @param next - The next middleware function for error handling.
 * @returns A promise that resolves to sending a success message if OTP is sent, or an error if the process fails.
 */

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

/**
 * Handles verification of user registration by validating input data and verifying the OTP sent to the user's email.
 *
 * This function first validates the registration data for required fields such as name, email, and OTP.
 * It checks if a user with the given email already exists in the database. If the user does not exist, it proceeds
 * to verify the OTP sent to the email. If the OTP is valid, the user is created and the response is sent with a success message.
 *
 * @param req - The HTTP request object containing registration data in the body.
 * @param res - The HTTP response object used to send the status of the registration process.
 * @param next - The next middleware function for error handling.
 * @returns A promise that resolves to sending a success message if the user is created, or an error if the process fails.
 */
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

/**
 * Handles user login by validating input data, checking for existing users,
 * and generating an access token and refresh token for the user.
 *
 * This function first validates the login data for required fields such as
 * email and password. It checks if a user with the given email exists in the
 * database. If the user exists, it proceeds to check if the given password
 * matches the user's password in the database. If the password is valid, the
 * function generates an access token and a refresh token for the user, and
 * stores them in an httpOnly secure cookie. The response is sent with a success
 * message.
 *
 * @param req - The HTTP request object containing login data in the body.
 * @param res - The HTTP response object used to send the status of the login process.
 * @param next - The next middleware function for error handling.
 * @returns A promise that resolves to sending a success message if the user is logged in, or an error if the process fails.
 */
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
      { id: user.id, email: user.email, name: user.name, role: "user" },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: "user" },
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

/**
 * Handles refreshing an access token by verifying the refresh token
 * and generating a new access token for the user.
 *
 * This function first checks if a refresh token exists in the request
 * cookies. If it does not, it throws an unauthorized error. If the
 * refresh token is valid, it verifies the token and retrieves the user
 * associated with the token. If the user is found, it generates a new
 * access token and stores it in the response cookies. The response is
 * sent with a success message and the user data.
 *
 * @param req - The HTTP request object containing the refresh token
 *              in the cookies.
 * @param res - The HTTP response object used to send the new access token
 *              and user data.
 * @param next - The next middleware function for error handling.
 * @returns A promise that resolves to sending a success message if the
 *          access token is refreshed, or an error if the process fails.
 */
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

/**
 * Returns the currently logged in user
 * @param {Request} req Express request object
 * @param {Response} res Express response object
 * @param {NextFunction} next Express next function
 * @description
 * 1. Retrieves the user from the request object
 * 2. Returns the user in the response
 * @returns {Response} with the user object
 */
export const getUser = async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      message: "User found successfully!",
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    next(error);
  }
};
