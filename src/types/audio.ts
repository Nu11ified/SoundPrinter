export interface AudioFingerprint {
  id: number;
  name: string;
  fingerprint: string;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AudioMatch {
  id: number;
  name: string;
  duration: number;
  similarity: number;
}

export interface AudioFeatures {
  peaks: number[];
  frequencies: number[];
  timestamps: number[];
} 