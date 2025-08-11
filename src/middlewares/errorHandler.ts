import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error("Global error handler:", error);

  let statusCode = 500;
  let message = "Internal server error";

  if (error.message) {
    message = error.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};
