export type SubscriptionPlan = "free" | "pro";

export type ClientStatus = "active" | "inactive" | "paused";

export type PackagePaymentStatus = "unpaid" | "partial" | "paid";
export type PackageStatus = "active" | "completed" | "expired";

export type SessionStatus = "completed" | "cancelled" | "no-show";

export type BookingStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed"
  | "no-show";
export type BookingSessionType = "1-on-1" | "group" | "assessment";
export type BookingSource = "trainer" | "client_link";

export type PaymentMethod =
  | "PayNow"
  | "cash"
  | "bank_transfer"
  | "card"
  | "other";
export type PaymentStatus = "received" | "pending" | "overdue";

export interface Profile {
  id: string;
  name: string;
  photo_url: string | null;
  whatsapp_number: string;
  booking_slug: string;
  bio: string | null;
  specialisations: string[];
  default_session_mins: number;
  subscription_plan: SubscriptionPlan;
  stripe_customer_id: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  trainer_id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  whatsapp_number: string;
  email: string | null;
  goals: string | null;
  injuries_medical: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  status: ClientStatus;
  last_session_date: string | null;
  created_at: string;
}

export interface Package {
  id: string;
  trainer_id: string;
  client_id: string;
  name: string;
  total_sessions: number;
  sessions_used: number;
  price: number;
  amount_paid: number;
  payment_status: PackagePaymentStatus;
  status: PackageStatus;
  start_date: string;
  expiry_date: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  trainer_id: string;
  client_id: string;
  package_id: string | null;
  date_time: string;
  duration_mins: number;
  location: string | null;
  notes: string | null;
  status: SessionStatus;
  created_at: string;
}

export interface Booking {
  id: string;
  trainer_id: string;
  client_id: string;
  package_id: string | null;
  date_time: string;
  duration_mins: number;
  location: string | null;
  session_type: BookingSessionType;
  status: BookingStatus;
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
  booking_source: BookingSource;
  client_intake_notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  trainer_id: string;
  client_id: string;
  package_id: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  due_date: string | null;
  received_date: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}
