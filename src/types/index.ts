export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: "customer" | "salon_owner" | "admin";
  created_at: string;
  updated_at: string;
}

export interface Salon {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string;
  tagline?: string;
  address: string;
  area: string;
  city: string;
  pincode: string;
  lat?: number;
  lng?: number;
  google_maps_url?: string;
  phone: string;
  email: string;
  website?: string;
  cover_image: string;
  gallery_images: string[];
  category: "women" | "men" | "unisex";
  rating: number;
  review_count: number;
  starting_price: number;
  is_verified: boolean;
  is_active: boolean;
  amenities: string[];
  working_hours: WorkingHours;
  created_at: string;
  updated_at: string;
  distance?: number;
}

export interface WorkingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  is_closed: boolean;
}

export interface Service {
  id: string;
  salon_id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  duration: number; // in minutes
  is_active: boolean;
  image_url?: string;
  created_at: string;
}

export interface Staff {
  id: string;
  salon_id: string;
  name: string;
  role: string;
  specialization: string[];
  avatar_url?: string;
  rating: number;
  experience_years: number;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  booking_id: string;
  user_id: string;
  salon_id: string;
  service_id: string;
  staff_id?: string;
  booking_date: string;
  time_slot: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  coupon_code?: string;
  payment_status: "pending" | "paid" | "refunded";
  payment_method?: string;
  notes?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  salon?: Salon;
  service?: Service;
  staff?: Staff;
}

export interface Review {
  id: string;
  user_id: string;
  salon_id: string;
  booking_id?: string;
  rating: number;
  comment: string;
  images?: string[];
  is_verified: boolean;
  ai_summary?: string;
  helpful_count: number;
  created_at: string;
  user?: User;
}

export interface Favorite {
  id: string;
  user_id: string;
  salon_id: string;
  created_at: string;
  salon?: Salon;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  usage_limit?: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  applicable_salons?: string[];
  created_at: string;
}

export interface TimeSlot {
  time: string;
  is_available: boolean;
  is_break?: boolean;
}

export interface SearchFilters {
  query?: string;
  area?: string;
  service?: string;
  date?: string;
  category?: "women" | "men" | "unisex";
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: "recommended" | "rating" | "price_low" | "price_high" | "nearest";
}

export interface BookingStep {
  step: 1 | 2 | 3 | 4 | 5;
  selectedService?: Service;
  selectedStaff?: Staff;
  selectedDate?: string;
  selectedTimeSlot?: string;
}

export interface CartItem {
  service: Service;
  staff?: Staff;
  date: string;
  timeSlot: string;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  images?: any[];
}

export interface SalonStats {
  total_bookings: number;
  total_revenue: number;
  avg_rating: number;
  total_reviews: number;
  pending_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  monthly_revenue: number[];
  top_services: { name: string; count: number }[];
}
