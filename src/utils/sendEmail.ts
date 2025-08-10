import nodemailer from "nodemailer";
import { ENV } from "../config/env.js";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: ENV.SMTP_HOST,
  port: ENV.SMTP_PORT,
  secure: false,
  auth: {
    user: ENV.SMTP_USER,
    pass: ENV.SMTP_PASS,
  },
});

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    await transporter.sendMail({
      from: `"AutoHarbour" <${ENV.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};
export const sendOTPEmail = async (
  email: string,
  otp: string,
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET"
): Promise<void> => {
  const subject =
    type === "EMAIL_VERIFICATION" ? "Verify your email" : "Reset your password";
  const purpose =
    type === "EMAIL_VERIFICATION"
      ? "verify your email address"
      : "reset your password";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">AutoHarbour - ${subject}</h2>
      <p>Hello,</p>
      <p>Please use the following code to ${purpose}:</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #007bff; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 14px;">Best regards,<br>AutoHarbour Team</p>
    </div>
  `;
  await sendEmail({
    to: email,
    subject: `AutoHarbour - ${subject}`,
    html,
  });
};
