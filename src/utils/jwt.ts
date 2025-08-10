import jwt from "jsonwebtoken";
import { ENV } from "../config/env.js";
import type { JWTPayload } from "../types/user.js";

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as jwt.JwtPayload;
    return decoded as JWTPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

export const extractTokenFromHeader = (authHeader: string): string => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("No token provided");
  }
  return authHeader.substring(7);
};
