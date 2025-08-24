export interface UserProfile {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  dateOfBirth?: Date;
  isVerified: boolean;
  isActive: boolean;
  lastSeen?: Date;
  joinedAt: Date;
  totalListings: number;
  activeListings: number;
  rating?: number;
  reviewCount: number;
}

export interface PublicUserProfile {
  id: number;
  name: string;
  avatar?: string;
  bio?: string;
  location?: string;
  isVerified: boolean;
  joinedAt: Date;
  totalListings: number;
  activeListings: number;
  rating?: number;
  reviewCount: number;
  lastSeen?: Date;
}

export interface UpdateProfileDTO {
  name?: string;
  bio?: string;
  location?: string;
  dateOfBirth?: Date;
  phone?: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data?: UserProfile | PublicUserProfile;
}

export interface UserVerificationRequest {
  userId: number;
  documentType: "ID_CARD" | "PASSPORT" | "DRIVERS_LICENSE";
  documentNumber: string;
  documentImages: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: number;
  rejectionReason?: string;
}
