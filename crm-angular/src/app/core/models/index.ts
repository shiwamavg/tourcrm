// Domain models matching the backend response shapes

export type Role = 'admin' | 'manager' | 'telecaller' | 'accounts';

export interface User {
    id: number;
    full_name: string;
    email: string;
    role: Role;
    phone?: string;
}

export type PackageType =
    | 'hotel' | 'car' | 'flight'
    | 'hotel_car' | 'hotel_flight' | 'car_flight' | 'hotel_car_flight';

export type RoomType = 'standard' | 'deluxe' | 'premium' | 'luxury' | 'suite';
export type MealPlan = 'none' | 'breakfast' | 'breakfast_dinner' | 'all_inclusive';
export type CarClass = 'economy' | 'standard' | 'premium' | 'luxury';
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'superseded';

export interface Destination {
    id: number;
    name: string;
    state?: string;
    country: string;
    is_active: boolean;
}

export interface CarType {
    id: number;
    name: string;
    capacity: number;
    is_active: boolean;
}

export interface HotelRate {
    id: number;
    destination_id: number;
    destination_name?: string;
    hotel_name: string;
    star_rating: '1' | '2' | '3' | '4' | '5';
    room_type: RoomType;
    meal_plan: MealPlan;
    charge_per_night: number;
    is_active: boolean;
    valid_from?: string;
    valid_till?: string;
    notes?: string;
}

export interface CarRate {
    id: number;
    destination_id: number;
    destination_name?: string;
    car_type_id: number;
    car_type_name?: string;
    capacity?: number;
    car_class: CarClass;
    charge_per_day: number;
    km_limit_per_day: number;
    extra_charge_per_km: number;
    is_active: boolean;
    valid_from?: string;
    valid_till?: string;
    notes?: string;
}

export interface QuotationHotelLine {
    id?: number;
    hotel_rate_id?: number | null;
    hotel_name: string;
    star_rating?: '1' | '2' | '3' | '4' | '5' | null;
    room_type: RoomType;
    meal_plan: MealPlan;
    charge_per_night: number;
    num_nights: number;
    num_rooms: number;
    special_charges?: number;
    special_charges_note?: string;
    line_total?: number;
}

export interface QuotationCarLine {
    id?: number;
    car_rate_id?: number | null;
    car_type_name: string;
    car_class: CarClass;
    charge_per_day: number;
    num_days: number;
    km_limit_per_day: number;
    extra_charge_per_km: number;
    estimated_extra_km: number;
    extra_km_charges?: number;
    line_total?: number;
}

export interface QuotationFlightLine {
    id?: number;
    airline?: string;
    route?: string;
    flight_date?: string;
    fare_per_adult: number;
    fare_per_child: number;
    num_adults?: number;
    num_children?: number;
    line_total?: number;
}

export interface QuotationMiscLine {
    id?: number;
    label: string;
    amount: number;
}

export interface DaywiseItineraryItem {
    id?: number;
    quote_id?: number;
    itenary_name: string;
    hotel_name?: string;
    date: string;
    day: number;
    day_name: string;
    vehicle_type: string;
    amt: number;
    details: string;
}

export interface Quotation {
    id: number;
    quotation_number: string;
    lead_id?: number;
    customer_name: string;
    customer_email?: string;
    customer_phone: string;
    created_by: number;
    created_by_name?: string;
    destination_id?: number;
    destination_text?: string;
    destination_name?: string;
    trip_start_date: string;
    trip_end_date: string;
    nights: number;
    adults: number;
    children_below_5: number;
    children_above_5: number;
    num_rooms: number;
    package_type: PackageType;
    hotel_total: number;
    car_total: number;
    flight_total: number;
    misc_total: number;
    subtotal: number;
    markup_pct: number;
    markup_amount: number;
    gst_pct: number;
    gst_amount: number;
    grand_total: number;
    status: QuotationStatus;
    valid_till?: string;
    terms_notes?: string;
    internal_notes?: string;
    version: number;
    parent_quotation_id?: number;
    parent_quotation_number?: string;
    revision_note?: string;
    created_at: string;
    updated_at: string;
    hotels: QuotationHotelLine[];
    cars: QuotationCarLine[];
    flights: QuotationFlightLine[];
    misc: QuotationMiscLine[];
    daywise_itinerary?: DaywiseItineraryItem[];
}

export interface QuotationListItem {
    id: number;
    quotation_number: string;
    status: QuotationStatus;
    trip_start_date: string;
    trip_end_date: string;
    grand_total: number;
    adults: number;
    package_type: PackageType;
    created_at: string;
    customer_name: string;
    customer_phone: string;
    destination_text?: string;
    destination_name?: string;
    created_by_name?: string;
    parent_quotation_id?: number;
    parent_quotation_number?: string;
    revision_note?: string;
    valid_until?: string;
    booking_id?: number;
}


export interface QuotationListResponse {
    items: QuotationListItem[];
    total: number;
    page: number;
    limit: number;
}

export interface QuotationStats {
    total: number;
    drafts: number;
    sent: number;
    accepted: number;
    rejected: number;
    total_value: number;
}

export interface AgencySettings {
    id?: number;
    agency_name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    gstin?: string;
    logo_url?: string;
    default_booking_fee_pct: number;
    default_markup_pct: number;
    default_gst_pct: number;
    default_quotation_valid_days: number;
    invoice_prefix: string;
    invoice_counter: number;
    // Bank details (printed on invoices)
    bank_name?: string;
    bank_account_no?: string;
    bank_ifsc?: string;
    bank_branch?: string;
    // Cashfree (display only; real values live in backend .env)
    cashfree_app_id?: string;
    cashfree_secret_key?: string;
    cashfree_webhook_secret?: string;
    cashfree_env?: 'TEST' | 'PROD';
}

// ────────────────────────────────────────────────────────────
// Bookings
// ────────────────────────────────────────────────────────────
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded';

export interface Booking {
    id: number;
    booking_number: string;
    quotation_id?: number;
    quotation_number?: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    destination_text?: string;
    destination_name?: string;
    trip_start_date: string;
    trip_end_date: string;
    adults: number;
    children_below_5: number;
    children_above_5: number;
    total_amount: number;
    booking_fee_pct: number;
    booking_fee_amount: number;
    amount_paid: number;
    balance_due?: number;
    status: BookingStatus;
    payment_status: PaymentStatus;
    special_requests?: string;
    internal_notes?: string;
    created_at: string;
    updated_at: string;
    created_by_name?: string;
    package_type?: string;
    package_id?: number | null;
    package_title?: string | null;
}

export interface BookingListItem {
    id: number;
    booking_number: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    destination_text?: string;
    destination_name?: string;
    trip_start_date: string;
    trip_end_date: string;
    total_amount: number;
    amount_paid: number;
    balance_due?: number;
    status: BookingStatus;
    payment_status: PaymentStatus;
    created_at: string;
    package_type?: string;
    package_id?: number | null;
    package_title?: string | null;
}

export interface BookingListResponse {
    items: BookingListItem[];
    total: number;
    page: number;
    limit: number;
}

export interface BookingTraveller {
    id?: number;
    booking_id: number;
    full_name: string;
    age?: number | null;
    aadhar_number?: string | null;
    traveller_type: 'adult' | 'child_below_5' | 'child_above_5';
}

// ────────────────────────────────────────────────────────────
// Payments
// ────────────────────────────────────────────────────────────
export type PaymentGateway = 'cashfree' | 'cash' | 'bank_transfer' | 'upi' | 'card' | 'other';
export type PaymentStatus2 = 'created' | 'paid' | 'failed' | 'refunded';

export interface Payment {
    id: number;
    booking_id: number;
    quotation_id?: number;
    gateway: PaymentGateway;
    gateway_order_id?: string;
    gateway_payment_id?: string;
    amount: number;
    currency: string;
    status: PaymentStatus2;
    method_label?: string;
    paid_at?: string;
    failed_at?: string;
    refunded_at?: string;
    collected_by?: number;
    offline_reference?: string;
    offline_note?: string;
    created_at: string;
    // joined
    booking_number?: string;
    customer_name?: string;
    customer_phone?: string;
    total_amount?: number;
}

export interface PaymentListResponse {
    items: Payment[];
    total: number;
    page: number;
    limit: number;
}

export interface CashfreeOrderResponse {
    payment_id: number;
    order_id: string;
    cf_order_id: string;
    payment_session_id: string;
    amount: number;
    env: 'TEST' | 'PROD';
}

// ────────────────────────────────────────────────────────────
// Invoices
// ────────────────────────────────────────────────────────────
export interface Invoice {
    id: number;
    invoice_number: string;
    booking_id: number;
    quotation_id?: number;
    subtotal: number;
    tax_amount: number;
    total: number;
    pdf_path?: string;
    pdf_generated_at?: string;
    issued_at: string;
    issued_by?: number;
    notes?: string;
    // joined
    booking_number?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    trip_start_date?: string;
    trip_end_date?: string;
    total_amount?: number;
    amount_paid?: number;
    package_type?: string;
    package_name?: string;
    grand_total?: number;
}

export interface InvoiceListResponse {
    items: Invoice[];
    total: number;
    page: number;
    limit: number;
}

// ────────────────────────────────────────────────────────────
// Reviews
// ────────────────────────────────────────────────────────────
export interface Review {
    id: number;
    booking_id: number;
    customer_name: string;
    customer_email?: string;
    rating: number;          // 1..5
    title?: string;
    comment: string;
    is_verified: number;     // 0/1
    is_visible: number;      // 0/1
    admin_reply?: string;
    admin_reply_at?: string;
    admin_reply_by?: number;
    created_at: string;
    // joined
    booking_number?: string;
    customer_phone?: string;
    destination_name?: string;
}

export interface ReviewListResponse {
    items: Review[];
    total: number;
    page: number;
    limit: number;
    avg_rating?: string;
}

// ─────────────────────────────────────────────────────────────
// Leads (sales pipeline)
// ─────────────────────────────────────────────────────────────
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost' | 'junk';
export type LeadSource =
    | 'manual' | 'website_form' | 'google_sheet' | 'csv_upload'
    | 'meta_ads' | 'walk_in' | 'referral' | 'whatsapp' | 'phone' | 'other' | 'demo_request';

export interface Lead {
    id: number;
    full_name: string;
    email?: string | null;
    phone: string;
    destination_text?: string | null;
    source: LeadSource;
    status: LeadStatus;
    rating?: 'hot' | 'warm' | 'cold' | null;
    converted_quotation_id?: number | null;
    converted_quotation_number?: string | null;
    assigned_to?: number | null;
    assigned_to_name?: string | null;
    follow_up_at?: string | null;
    notes?: string | null;
    source_meta?: any;
    created_by?: number | null;
    created_at: string;
    updated_at: string;
    package_id?: number | null;
    package_title?: string | null;
    budget?: number | null;
    travel_month?: string | null;
    pax?: number | null;
    tour_type?: string | null;
}


export type FollowupType = 'call' | 'email' | 'whatsapp' | 'meeting' | 'site_visit' | 'other';

export interface Followup {
    id: number;
    company_id: number;
    lead_id?: number | null;
    quotation_id?: number | null;
    booking_id?: number | null;
    user_id: number;
    user_name?: string;
    followup_type: FollowupType;
    notes: string;
    rating?: 'hot' | 'warm' | 'cold' | null;
    next_remind_at?: string | null;
    next_reminder_id?: number | null;
    is_system: boolean | number;
    created_at: string;
    updated_at: string;
    quotation_number?: string | null;
    booking_number?: string | null;
}

export interface LeadListResponse {
    items: Lead[];
    total: number;
    page: number;
    limit: number;
}

export interface LeadStats {
    by_status: { status: LeadStatus; n: number }[];
    by_source: { source: LeadSource; n: number }[];
    totals: {
        total: number;
        new_count: number;
        contacted_count: number;
        qualified_count: number;
        converted_count: number;
        lost_count: number;
        junk_count: number;
        overdue_followups: number;
    };
}

export interface LeadConvertResponse {
    ok: boolean;
    quotation_id: number;
    quotation_number: string;
    lead_id: number;
}

export interface LeadBulkImportResponse {
    ok: boolean;
    inserted: number;
    skipped: number;
    inserted_items: { row: number; id: number; name: string }[];
    skipped_items: { row: number; reason: string }[];
}

// ─────────────────────────────────────────────────────────────
// Users & Roles
// ─────────────────────────────────────────────────────────────
export interface RoleRecord {
    id: number;
    name: string;
    slug: string;
    description?: string;
    permissions: Record<string, string[]>;
    is_active: boolean;
}

export interface StaffUser {
    id: number;
    full_name: string;
    email: string;
    phone?: string;
    role: 'admin' | 'manager' | 'telecaller' | 'accounts';
    role_id?: number;
    role_name?: string;
    role_slug?: string;
    is_active: boolean;
    last_login_at?: string;
    created_at: string;
}

export interface UserListResponse {
    items: StaffUser[];
    total: number;
    page: number;
    limit: number;
}
