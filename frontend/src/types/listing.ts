export interface Listing {
  listingId: string;
  title: string;
  description?: string;
  type: string;
  price: number;
  currency: string;
  countryCode: string;
  region?: string;
  city?: string;
  area?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  mediaKeys?: string[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}
