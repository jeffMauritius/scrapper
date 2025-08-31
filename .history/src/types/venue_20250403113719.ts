export interface VenueData {
  type: string;
  name: string;
  description: string;
  price: {
    startingPrice: number;
    currency: string;
  };
  address: {
    city: string;
    region: string;
    country: string;
  };
  capacity: {
    min?: number;
    max: number;
  };
  rating: {
    score: number;
    numberOfReviews: number;
  };
  images: string[];
}