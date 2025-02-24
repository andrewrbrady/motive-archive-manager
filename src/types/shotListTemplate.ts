export interface Shot {
  title: string;
  description: string;
  angle?: string;
  lighting?: string;
  notes?: string;
}

export interface ShotListTemplate {
  _id: string;
  name: string;
  description: string;
  shots: Shot[];
  createdAt?: string;
  updatedAt?: string;
}
