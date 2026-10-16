// Types generated from OpenAPI schema (AutoShare API v1.0.0)

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

export interface RegisterRequest {
  last_name: string;
  first_name: string;
  middle_name?: string | null;
  birth_date: string; // ISO date
  phone: string;
  email: string;
  password: string;
  license_number: string;
  license_issued: string; // ISO date
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ClientOut {
  client_id: number;
  last_name: string;
  first_name: string;
  middle_name?: string | null;
  birth_date: string;
  phone: string;
  email: string;
  is_email_verified: boolean;
  license_number: string;
  status: string;
  balance: number;
}

export interface StaffCreateRequest {
  full_name: string;
  email: string;
  phone?: string | null;
  password: string;
  role: string;
}

export interface StaffOut {
  staff_id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
}

export interface CarCreateRequest {
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  color?: string | null;
  car_class: string;
  tariff_id?: number | null;
  zone_id?: number | null;
}

export interface CarOut {
  car_id: number;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  color?: string | null;
  car_class: string;
  status: string;
  mileage: number;
  tariff_id?: number | null;
  zone_id?: number | null;
  last_service?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface CarUpdateStatusRequest {
  status: string;
}

export interface ZoneCreateRequest {
  name: string;
  zone_type: string;
  boundary: string;
}

export interface ZoneOut {
  zone_id: number;
  name: string;
  zone_type: string;
  boundary?: string | null;
}

export interface TariffCreateRequest {
  name: string;
  tariff_type: string;
  rate_active: number;
  rate_pause: number;
  rate_km: number;
  min_charge?: number;
  zone_id?: number | null;
}

export interface TariffOut {
  tariff_id: number;
  name: string;
  tariff_type: string;
  rate_active: number;
  rate_pause: number;
  rate_km: number;
  min_charge: number;
  zone_id?: number | null;
  status: string;
  valid_from: string;
}

export interface DiscountCreateRequest {
  code: string;
  type: string;
  value: number;
  valid_from?: string;
  valid_until?: string | null;
  usage_limit?: number | null;
}

export interface DiscountOut {
  discount_id: number;
  code: string;
  type: string;
  value: number;
  valid_from: string;
  valid_until?: string | null;
  usage_limit?: number | null;
  used_count?: number;
  status?: string;
}

export interface BookingCreateRequest {
  car_id: number;
  discount_code?: string | null;
}

export interface BookingOut {
  booking_id: number;
  client_id: number;
  car_id: number;
  discount_id?: number | null;
  created_at: string;
  expires_at: string;
  status: string;
}

export interface StartRentalRequest {
  booking_id: number;
}

export interface RentalActionRequest {
  distance_km?: number | null;
}

export interface RentalOut {
  rental_id: number;
  booking_id: number;
  client_id: number;
  car_id: number;
  tariff_id: number;
  started_at: string;
  finished_at?: string | null;
  active_minutes: number;
  pause_minutes: number;
  distance_km: number;
  total_cost?: number | null;
  status: string;
}

export interface PaymentCreateRequest {
  rental_id?: number | null;
  client_id: number;
  amount: number;
  payment_type: string;
}

export interface PaymentOut {
  payment_id: number;
  rental_id?: number | null;
  client_id: number;
  amount: number;
  payment_type: string;
  status: string;
  external_id?: string | null;
  processed_at: string;
}

export interface MaintenanceCreateRequest {
  car_id: number;
  work_type: string;
  description?: string | null;
  assigned_to_staff_id?: number | null;
}

export interface MaintenanceCloseRequest {
  description?: string | null;
}

export interface MaintenanceOut {
  maintenance_id: number;
  car_id: number;
  work_type: string;
  description?: string | null;
  assigned_to_staff_id?: number | null;
  created_at: string;
  completed_at?: string | null;
  status?: string;
}

export interface AuditLogOut {
  log_id: number;
  actor_type: string;
  actor_id?: number | null;
  action: string;
  entity: string;
  entity_id?: number | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export interface ClientVerifyRequest {
  client_id: number;
}

export type UserType = "client" | "staff";

export interface StoredAuth {
  access_token: string;
  refresh_token: string;
  user_type: UserType;
}

export interface JwtPayload {
  sub?: string;
  role?: string;
  user_type?: string;
  exp?: number;
  [k: string]: unknown;
}