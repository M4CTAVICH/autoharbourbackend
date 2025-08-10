export interface CreateOTPDTO {
  userId: number;
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET";
}

export interface VerifyOTPDTO {
  code: string;
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET";
  email: string;
}

export interface OTPResponse {
  message: string;
  expiresAt: Date;
}
