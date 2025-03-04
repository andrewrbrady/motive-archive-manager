export interface Shot {
  title: string;
  description: string;
  angle?: string;
  lighting?: string;
  notes?: string;
  thumbnail?: string;
}

export interface ShotListTemplate {
  _id: string;
  name: string;
  description: string;
  shots: Shot[];
  thumbnail?: string;
  createdAt?: string;
  updatedAt?: string;
}
