// Add to your upload types
export interface CloudinaryUsage {
  storage: number;
  bandwidth: number;
  transformations: number;
  limits: {
    storage: number;
    bandwidth: number;
    transformations: number;
  };
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    urls: string[];
    publicIds: string[];
    optimizedUrls?: {
      small: string[];
      medium: string[];
      large: string[];
    };
  };
}

export interface DeleteImageResponse {
  success: boolean;
  message: string;
  deleted?: string[];
  failed?: string[];
  savedBandwidth?: number;
}
