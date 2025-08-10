export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
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
