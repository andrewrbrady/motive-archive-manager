export type Project = {
  id: string;
  title: string;
  client: string;
  description: string;
  thumbnailUrl: string;
  slug: string;
  createdAt: string;
  category: 'photography' | 'service' | 'auction' | 'detailing';
}