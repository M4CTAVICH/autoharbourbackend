import { config } from "dotenv";

config();

export const ENV = {
  // Server
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV || "development",

  // URLs
  FRONTEND_URL: process.env.FRONTEND_URL,
  API_URL: process.env.API_URL,
  FRONTEND_URL_WWW: process.env.FRONTEND_URL_WWW,

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // Email Configuration
  SMTP_HOST: process.env.SMTP_HOST!,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "587"),
  SMTP_USER: process.env.SMTP_USER!,
  SMTP_PASS: process.env.SMTP_PASS!,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,

  // Elasticsearch
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
};

// Validate required environment variables
const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
