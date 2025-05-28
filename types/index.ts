export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  gender: 'Male' | 'Female' | 'Other';
  rides_given: number;
  rides_taken: number;
  created_at: string;
}

export interface VehicleType {
  id: string;
  name: string;
  total_seats: number;
}

export interface Ride {
  id: string;
  driver_id: string;
  source: {
    latitude: number;
    longitude: number;
  };
  intermediate_points: { latitude: number; longitude: number }[];
  destination: {
    latitude: number;
    longitude: number;
  };
  vehicle_type_id: string;
  available_seats: number;
  fare: number;
  female_only: boolean;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Booking {
  id: string;
  ride_id: string;
  passenger_id: string;
  pickup_point: { latitude: number; longitude: number };
  drop_point: { latitude: number; longitude: number };
  seats_booked: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
} 