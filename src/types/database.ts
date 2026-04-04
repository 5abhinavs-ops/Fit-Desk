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
  | "no-show"
  | "upcoming"
  | "forfeited"
  | "no_show"
  | "pending_approval"
  | "reschedule_requested";

export type CancelledBy = "pt" | "client";

export type BookingApprovalStatus = "pending" | "approved" | "declined";
export type BookingSessionType = "1-on-1" | "group" | "assessment";
export type BookingSource = "trainer" | "client_link";

/**
 * How payment is collected when a client books a session.
 *
 * - "pay_now"     — Client pays via Stripe at the time of booking.
 *                   A pending Payment record is created immediately.
 *                   Booking stays "pending" until Stripe confirms.
 *
 * - "pay_later"   — PT records the booking; payment is settled
 *                   offline (cash / PayNow / bank transfer).
 *                   A Payment record is created with status "pending"
 *                   and a due_date set by the PT.
 *                   Reminder cron picks this up and sends WhatsApp chasers.
 *
 * - "from_package" — Session is deducted from a pre-paid package.
 *                   No new Payment record is created.
 *                   Package.sessions_used increments on completion.
 */
export type BookingPaymentMode = "pay_now" | "pay_later" | "from_package";

export type PaymentMethod =
  | "PayNow"
  | "cash"
  | "bank_transfer"
  | "card"
  | "other";
export type PaymentStatus = "received" | "pending" | "overdue";

/**
 * Overdue reminder stages tracked per Payment row.
 * Lets the cron skip already-sent messages without re-querying send logs.
 * Progresses: none -> due_today_sent -> day_1 -> day_3 -> day_7.
 */
export type OverdueReminderStage = "none" | "due_today_sent" | "day_1" | "day_3" | "day_7";

export type BookingPaymentStatus = "unpaid" | "client_confirmed" | "paid" | "waived";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

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
  /**
   * Default payment mode shown on the booking form.
   * PT can override this per individual booking.
   * Defaults to "pay_later" — safest for cash-heavy SEA market.
   */
  default_booking_payment_mode: BookingPaymentMode;
  /**
   * PT's PayNow number or UEN — shown in payment reminder messages
   * and on the public booking confirmation page.
   */
  paynow_details: string | null;
  instagram_url: string | null;
  cancellation_policy_hours: number;
  booking_approval_required: boolean;
  paynow_number: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  payment_link: string | null;
  payment_reminder_default_days: number;
  booking_headline: string | null;
  why_train_with_me: string | null;
  pricing_from: number | null;
  testimonial_1: string | null;
  testimonial_2: string | null;
  testimonial_3: string | null;
  training_locations: string[];
  onboarding_completed: boolean;
  onboarding_steps: Record<string, boolean>;
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
  payment_reminder_days: number | null;
  last_reactivation_alert_sent: string | null;
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
  last_low_session_alert_sent: string | null;
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
  /**
   * How payment is handled for this specific booking.
   * Overrides profile.default_booking_payment_mode for this booking only.
   */
  payment_mode: BookingPaymentMode;
  /**
   * Stripe PaymentIntent ID — only populated when payment_mode = "pay_now"
   * and the client has completed checkout.
   */
  stripe_payment_intent_id: string | null;
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
  booking_source: BookingSource;
  client_intake_notes: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: CancelledBy | null;
  late_minutes: number | null;
  attendance_confirmed_at: string | null;
  chase_sent_at: string | null;
  payment_status: BookingPaymentStatus;
  payment_amount: number | null;
  client_paid_at: string | null;
  pt_confirmed_at: string | null;
  payment_reminder_sent_at: string | null;
  session_notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  trainer_id: string;
  client_id: string;
  package_id: string | null;
  /**
   * booking_id links this payment to a specific session.
   * Null for package-level payments (e.g. a deposit or instalment
   * not tied to a single booking).
   */
  booking_id: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  due_date: string | null;
  received_date: string | null;
  reference: string | null;
  notes: string | null;
  /**
   * Tracks how far the overdue reminder sequence has progressed.
   * Cron uses this to send day_1 → day_3 → day_7 WhatsApp chasers
   * without re-sending already-dispatched messages.
   */
  overdue_reminder_stage: OverdueReminderStage;
  created_at: string;
}

export interface SessionToken {
  id: string;
  booking_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface NutritionLog {
  id: string;
  client_id: string;
  trainer_id: string;
  photo_url: string | null;
  meal_name: string | null;
  meal_type: MealType | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  ai_raw_response: string | null;
  logged_at: string;
  created_at: string;
}

export interface BookingApproval {
  id: string;
  booking_id: string;
  status: BookingApprovalStatus;
  decided_at: string | null;
  created_at: string;
}
