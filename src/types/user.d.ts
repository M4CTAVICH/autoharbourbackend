export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
}
export interface UpdateUserDTO {
  name?: string;
  avatar?: string;
}
export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  isVerified: boolean;
  createdAt: Date;
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}
