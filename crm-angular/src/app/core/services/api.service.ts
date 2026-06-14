import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    Destination, CarType, HotelRate, CarRate, DaywiseItineraryItem,
    Quotation, QuotationListResponse, QuotationStats, AgencySettings,
    QuotationStatus,
    Booking, BookingListResponse, BookingStatus, PaymentStatus,
    Payment, PaymentListResponse, PaymentStatus2, PaymentGateway, CashfreeOrderResponse,
    Invoice, InvoiceListResponse,
    Review, ReviewListResponse,
    Lead, LeadStatus, LeadSource, LeadListResponse, LeadStats,
    LeadConvertResponse, LeadBulkImportResponse,
    StaffUser, UserListResponse, RoleRecord
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
    private http = inject(HttpClient);
    private base = environment.apiUrl;

    // ── Auth ──────────────────────────────────────────────
    me(): Observable<any> { return this.http.get(`${this.base}/auth/me`); }

    // ── Quotations ────────────────────────────────────────
    stats(): Observable<QuotationStats> {
        return this.http.get<QuotationStats>(`${this.base}/quotations/stats`);
    }
    listQuotations(params: { status?: QuotationStatus | ''; q?: string; page?: number; limit?: number } = {}): Observable<QuotationListResponse> {
        let p = new HttpParams();
        if (params.status) p = p.set('status', params.status);
        if (params.q)      p = p.set('q', params.q);
        if (params.page)   p = p.set('page', String(params.page));
        if (params.limit)  p = p.set('limit', String(params.limit));
        return this.http.get<QuotationListResponse>(`${this.base}/quotations`, { params: p });
    }
    getQuotation(id: number | string): Observable<Quotation> {
        return this.http.get<Quotation>(`${this.base}/quotations/${id}`);
    }
    createQuotation(body: Partial<Quotation>): Observable<Quotation> {
        return this.http.post<Quotation>(`${this.base}/quotations`, body);
    }
    updateQuotationStatus(id: number | string, status: QuotationStatus): Observable<Quotation> {
        return this.http.patch<Quotation>(`${this.base}/quotations/${id}/status`, { status });
    }
    /**
     * Create a new draft quotation cloned from an existing one. The previous
     * quotation is automatically marked 'superseded' on the server. Returns
     * the freshly-created draft.
     */
    updateQuotation(id: number | string, body: Partial<Quotation>): Observable<Quotation> {
        return this.http.put<Quotation>(`${this.base}/quotations/${id}`, body);
    }
    getDaywiseItinerary(quotationId: number | string): Observable<DaywiseItineraryItem[]> {
        return this.http.get<DaywiseItineraryItem[]>(`${this.base}/daywise-itinerary`, { params: { quote_id: String(quotationId) } });
    }
    hotelRatesFor(destinationId: number | string): Observable<HotelRate[]> {
        return this.http.get<HotelRate[]>(`${this.base}/quotations/master/hotel-rates`, {
            params: { destination_id: String(destinationId) }
        });
    }
    carRatesFor(destinationId: number | string): Observable<CarRate[]> {
        return this.http.get<CarRate[]>(`${this.base}/quotations/master/car-rates`, {
            params: { destination_id: String(destinationId) }
        });
    }

    // ── Admin ─────────────────────────────────────────────
    listDestinations(params: { q?: string; page?: number; limit?: number } = {}): Observable<{ items: Destination[]; total: number; page: number; limit: number }> {
        let p = new HttpParams();
        if (params.q)      p = p.set('q', params.q);
        if (params.page)   p = p.set('page', String(params.page));
        if (params.limit)  p = p.set('limit', String(params.limit));
        return this.http.get<{ items: Destination[]; total: number; page: number; limit: number }>(`${this.base}/admin/destinations`, { params: p });
    }
    createDestination(body: Partial<Destination>): Observable<Destination> {
        return this.http.post<Destination>(`${this.base}/admin/destinations`, body);
    }
    updateDestination(id: number, body: Partial<Destination>): Observable<Destination> {
        return this.http.patch<Destination>(`${this.base}/admin/destinations/${id}`, body);
    }

    listHotelRates(params: { destination_id?: number | string; q?: string; page?: number; limit?: number } = {}): Observable<{ items: HotelRate[]; total: number; page: number; limit: number }> {
        let p = new HttpParams();
        if (params.destination_id) p = p.set('destination_id', String(params.destination_id));
        if (params.q)               p = p.set('q', params.q);
        if (params.page)            p = p.set('page', String(params.page));
        if (params.limit)           p = p.set('limit', String(params.limit));
        return this.http.get<{ items: HotelRate[]; total: number; page: number; limit: number }>(`${this.base}/admin/hotel-rates`, { params: p });
    }
    createHotelRate(body: Partial<HotelRate>): Observable<HotelRate> {
        return this.http.post<HotelRate>(`${this.base}/admin/hotel-rates`, body);
    }
    updateHotelRate(id: number, body: Partial<HotelRate>): Observable<HotelRate> {
        return this.http.patch<HotelRate>(`${this.base}/admin/hotel-rates/${id}`, body);
    }
    deleteHotelRate(id: number): Observable<{ ok: boolean }> {
        return this.http.delete<{ ok: boolean }>(`${this.base}/admin/hotel-rates/${id}`);
    }

    listCarTypes(): Observable<CarType[]> {
        return this.http.get<CarType[]>(`${this.base}/admin/car-types`);
    }

    listCarRates(params: { destination_id?: number | string; q?: string; page?: number; limit?: number } = {}): Observable<{ items: CarRate[]; total: number; page: number; limit: number }> {
        let p = new HttpParams();
        if (params.destination_id) p = p.set('destination_id', String(params.destination_id));
        if (params.q)               p = p.set('q', params.q);
        if (params.page)            p = p.set('page', String(params.page));
        if (params.limit)           p = p.set('limit', String(params.limit));
        return this.http.get<{ items: CarRate[]; total: number; page: number; limit: number }>(`${this.base}/admin/car-rates`, { params: p });
    }
    createCarRate(body: Partial<CarRate>): Observable<CarRate> {
        return this.http.post<CarRate>(`${this.base}/admin/car-rates`, body);
    }
    updateCarRate(id: number, body: Partial<CarRate>): Observable<CarRate> {
        return this.http.patch<CarRate>(`${this.base}/admin/car-rates/${id}`, body);
    }
    deleteCarRate(id: number): Observable<{ ok: boolean }> {
        return this.http.delete<{ ok: boolean }>(`${this.base}/admin/car-rates/${id}`);
    }

    getSettings(): Observable<AgencySettings> {
        return this.http.get<AgencySettings>(`${this.base}/admin/settings`);
    }
    updateSettings(body: Partial<AgencySettings>): Observable<AgencySettings> {
        return this.http.patch<AgencySettings>(`${this.base}/admin/settings`, body);
    }

    // ── Bookings ───────────────────────────────────────────
    listBookings(params: { status?: BookingStatus; payment_status?: PaymentStatus; q?: string;
                           page?: number; limit?: number } = {}): Observable<BookingListResponse> {
        let p = new HttpParams();
        if (params.status)        p = p.set('status', params.status);
        if (params.payment_status) p = p.set('payment_status', params.payment_status);
        if (params.q)             p = p.set('q', params.q);
        if (params.page)          p = p.set('page', String(params.page));
        if (params.limit)         p = p.set('limit', String(params.limit));
        return this.http.get<BookingListResponse>(`${this.base}/admin/bookings`, { params: p });
    }
    getBooking(id: number | string): Observable<Booking> {
        return this.http.get<Booking>(`${this.base}/admin/bookings/${id}`);
    }
    updateBookingStatus(id: number | string, status: BookingStatus): Observable<Booking> {
        return this.http.patch<Booking>(`${this.base}/admin/bookings/${id}/status`, { status });
    }

    // ── Payments ───────────────────────────────────────────
    listPayments(params: { status?: PaymentStatus2; booking_id?: number;
                           gateway?: PaymentGateway; q?: string;
                           page?: number; limit?: number } = {}): Observable<PaymentListResponse> {
        let p = new HttpParams();
        if (params.status)     p = p.set('status', params.status);
        if (params.booking_id) p = p.set('booking_id', String(params.booking_id));
        if (params.gateway)    p = p.set('gateway', params.gateway);
        if (params.q)          p = p.set('q', params.q);
        if (params.page)       p = p.set('page', String(params.page));
        if (params.limit)      p = p.set('limit', String(params.limit));
        return this.http.get<PaymentListResponse>(`${this.base}/payments`, { params: p });
    }
    getPayment(id: number | string): Observable<Payment> {
        return this.http.get<Payment>(`${this.base}/payments/${id}`);
    }
    listPaymentsByBooking(bookingId: number | string): Observable<Payment[]> {
        return this.http.get<Payment[]>(`${this.base}/payments/booking/${bookingId}`);
    }
    recordOfflinePayment(body: {
        booking_id: number; amount: number; gateway?: PaymentGateway;
        method_label?: string; offline_reference?: string; offline_note?: string;
        status?: PaymentStatus2
    }): Observable<{ id: number; booking_id: number; amount: number; status: string; amount_paid: number }> {
        return this.http.post<{ id: number; booking_id: number; amount: number; status: string; amount_paid: number }>(
            `${this.base}/payments`, body
        );
    }
    createCashfreeOrder(booking_id: number, amount: number): Observable<CashfreeOrderResponse> {
        return this.http.post<CashfreeOrderResponse>(`${this.base}/payments/online`, { booking_id, amount });
    }

    // ── Invoices ───────────────────────────────────────────
    listInvoices(params: { booking_id?: number; page?: number; limit?: number } = {}): Observable<InvoiceListResponse> {
        let p = new HttpParams();
        if (params.booking_id) p = p.set('booking_id', String(params.booking_id));
        if (params.page)       p = p.set('page', String(params.page));
        if (params.limit)      p = p.set('limit', String(params.limit));
        return this.http.get<InvoiceListResponse>(`${this.base}/invoices`, { params: p });
    }
    getInvoice(id: number | string): Observable<Invoice> {
        return this.http.get<Invoice>(`${this.base}/invoices/${id}`);
    }
    listInvoicesByBooking(bookingId: number | string): Observable<Invoice[]> {
        return this.http.get<Invoice[]>(`${this.base}/invoices/booking/${bookingId}`);
    }
    /** Returns a Blob URL for the PDF. Caller is responsible for revoking it. */
    invoicePdfUrl(id: number | string): string {
        return `${this.base}/invoices/${id}/download`;
    }

    // ── Reviews ────────────────────────────────────────────
    listReviewsAdmin(params: { is_visible?: 0 | 1; page?: number; limit?: number; search?: string } = {}): Observable<ReviewListResponse> {
        let p = new HttpParams();
        if (params.is_visible !== undefined) p = p.set('is_visible', String(params.is_visible));
        if (params.page)   p = p.set('page', String(params.page));
        if (params.limit)  p = p.set('limit', String(params.limit));
        if (params.search) p = p.set('search', params.search);
        return this.http.get<ReviewListResponse>(`${this.base}/reviews/admin/all`, { params: p });
    }
    moderateReview(id: number | string, body: { is_visible?: boolean; admin_reply?: string }): Observable<{ ok: boolean }> {
        return this.http.patch<{ ok: boolean }>(`${this.base}/reviews/${id}`, body);
    }

    // ── Leads ───────────────────────────────────────────────────
    listLeads(params: {
        status?: string; source?: string; assigned_to?: number | string;
        q?: string; page?: number; limit?: number;
    } = {}): Observable<LeadListResponse> {
        let q = new URLSearchParams();
        for (const k of Object.keys(params) as (keyof typeof params)[]) {
            const v = params[k];
            if (v !== undefined && v !== null && v !== '') {
                q.set(k, String(v));
            }
        }
        const qs = q.toString();
        return this.http.get<LeadListResponse>(`${this.base}/leads${qs ? '?' + qs : ''}`);
    }
    getLead(id: number | string): Observable<Lead> {
        return this.http.get<Lead>(`${this.base}/leads/${id}`);
    }
    getReminderStats(): Observable<any> {
        return this.http.get<any>(`${this.base}/reminders/stats`);
    }
    getLeadStats(): Observable<LeadStats> {
        return this.http.get<LeadStats>(`${this.base}/leads/stats`);
    }
    createLead(body: Partial<Lead>): Observable<Lead> {
        return this.http.post<Lead>(`${this.base}/leads`, body);
    }
    updateLead(id: number | string, body: Partial<Lead>): Observable<Lead> {
        return this.http.patch<Lead>(`${this.base}/leads/${id}`, body);
    }
    assignLead(id: number | string, assigned_to: number | null): Observable<{ ok: boolean; assigned_to: number | null }> {
        return this.http.post<{ ok: boolean; assigned_to: number | null }>(`${this.base}/leads/${id}/assign`, { assigned_to });
    }
    setLeadStatus(id: number | string, status: string, note?: string): Observable<{ ok: boolean; status: string }> {
        return this.http.post<{ ok: boolean; status: string }>(`${this.base}/leads/${id}/status`, { status, note });
    }
    convertLead(id: number | string): Observable<LeadConvertResponse> {
        return this.http.post<LeadConvertResponse>(`${this.base}/leads/${id}/convert`, {});
    }
    getTodayFollowups(): Observable<Lead[]> {
        return this.http.get<Lead[]>(`${this.base}/leads/follow-ups/today`);
    }
    getOverdueFollowups(): Observable<Lead[]> {
        return this.http.get<Lead[]>(`${this.base}/leads/follow-ups/overdue`);
    }
    getAllFollowups(days = 7): Observable<Lead[]> {
        return this.http.get<Lead[]>(`${this.base}/leads/follow-ups/all?days=${days}`);
    }
    previewBulkImport(file: File): Observable<{ ok: boolean; total: number; valid: number; invalid: number; items: any[] }> {
        const fd = new FormData();
        fd.append('file', file);
        return this.http.post<{ ok: boolean; total: number; valid: number; invalid: number; items: any[] }>(`${this.base}/leads/bulk-preview`, fd);
    }
    bulkImportLeads(file: File): Observable<LeadBulkImportResponse> {
        const fd = new FormData();
        fd.append('file', file);
        return this.http.post<LeadBulkImportResponse>(`${this.base}/leads/bulk-import`, fd);
    }
    downloadSampleCsv(): string {
        return `${this.base}/leads/sample-csv`;
    }

    // ── Users ──────────────────────────────────────────────────
    listUsers(params: { q?: string; role?: string; is_active?: string; page?: number; limit?: number } = {}): Observable<UserListResponse> {
        let p = new HttpParams();
        if (params.q)          p = p.set('q', params.q);
        if (params.role)       p = p.set('role', params.role);
        if (params.is_active)  p = p.set('is_active', params.is_active);
        if (params.page)       p = p.set('page', String(params.page));
        if (params.limit)      p = p.set('limit', String(params.limit));
        return this.http.get<UserListResponse>(`${this.base}/users`, { params: p });
    }
    getUser(id: number | string): Observable<StaffUser> {
        return this.http.get<StaffUser>(`${this.base}/users/${id}`);
    }
    createUser(body: Partial<StaffUser> & { password: string }): Observable<StaffUser> {
        return this.http.post<StaffUser>(`${this.base}/users`, body);
    }
    updateUser(id: number | string, body: Partial<StaffUser>): Observable<StaffUser> {
        return this.http.patch<StaffUser>(`${this.base}/users/${id}`, body);
    }
    toggleUserActive(id: number | string): Observable<{ ok: boolean; is_active: boolean }> {
        return this.http.post<{ ok: boolean; is_active: boolean }>(`${this.base}/users/${id}/toggle`, {});
    }
    resetUserPassword(id: number | string, password: string): Observable<{ ok: boolean }> {
        return this.http.post<{ ok: boolean }>(`${this.base}/users/${id}/reset-password`, { password });
    }
    listRoles(): Observable<RoleRecord[]> {
        return this.http.get<RoleRecord[]>(`${this.base}/users/roles`);
    }
    getMyPermissions(): Observable<{ permissions: Record<string, string[]> }> {
        return this.http.get<{ permissions: Record<string, string[]> }>(`${this.base}/users/me/permissions`);
    }

    // ── Follow-ups & Customer Journey ────────────────────────────
    getJourney(params: { lead_id?: number; quotation_id?: number; booking_id?: number }): Observable<{ lead: any; quotations: any[]; bookings: any[]; journey: any[] }> {
        let p = new HttpParams();
        if (params.lead_id) p = p.set('lead_id', String(params.lead_id));
        if (params.quotation_id) p = p.set('quotation_id', String(params.quotation_id));
        if (params.booking_id) p = p.set('booking_id', String(params.booking_id));
        return this.http.get<any>(`${this.base}/followups/journey`, { params: p });
    }
    createFollowup(body: {
        lead_id?: number | null;
        quotation_id?: number | null;
        booking_id?: number | null;
        followup_type: string;
        notes: string;
        rating?: string | null;
        next_remind_at?: string | null;
        next_reminder_assignee?: number | null;
        status?: string | null;
    }): Observable<any> {
        return this.http.post<any>(`${this.base}/followups`, body);
    }
    deleteFollowup(id: number | string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.base}/followups/${id}`);
    }

    // ── Tenant Billing ───────────────────────────────────────────
    getBillingPlan(): Observable<any> {
        return this.http.get(`${this.base}/billing/current`);
    }
    getBillingInvoices(): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/billing/invoices`);
    }
    upgradeBillingPlan(packageId: number, billingCycle: string): Observable<any> {
        return this.http.post(`${this.base}/billing/upgrade`, { package_id: packageId, billing_cycle: billingCycle });
    }

    // ── Message Templates ───────────────────────────────────────
    listMessageTemplates(params: { category?: string; channel?: string } = {}): Observable<any[]> {
        let p = new HttpParams();
        if (params.category) p = p.set('category', params.category);
        if (params.channel) p = p.set('channel', params.channel);
        return this.http.get<any[]>(`${this.base}/message-templates`, { params: p });
    }
    getMessageTemplate(id: number | string): Observable<any> {
        return this.http.get<any>(`${this.base}/message-templates/${id}`);
    }
    createMessageTemplate(body: any): Observable<any> {
        return this.http.post<any>(`${this.base}/message-templates`, body);
    }
    updateMessageTemplate(id: number | string, body: any): Observable<any> {
        return this.http.patch<any>(`${this.base}/message-templates/${id}`, body);
    }
    deleteMessageTemplate(id: number | string): Observable<{ ok: boolean }> {
        return this.http.delete<{ ok: boolean }>(`${this.base}/message-templates/${id}`);
    }

    // ── Payment Reminders ───────────────────────────────────────
    listPaymentReminderSchedules(): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/payment-reminders`);
    }
    createPaymentReminderSchedule(body: any): Observable<any> {
        return this.http.post<any>(`${this.base}/payment-reminders`, body);
    }
    updatePaymentReminderSchedule(id: number | string, body: any): Observable<any> {
        return this.http.patch<any>(`${this.base}/payment-reminders/${id}`, body);
    }
    deletePaymentReminderSchedule(id: number | string): Observable<{ ok: boolean }> {
        return this.http.delete<{ ok: boolean }>(`${this.base}/payment-reminders/${id}`);
    }
    listPaymentReminderLogs(params: { booking_id?: number; status?: string; page?: number; limit?: number } = {}): Observable<any> {
        let p = new HttpParams();
        if (params.booking_id) p = p.set('booking_id', String(params.booking_id));
        if (params.status) p = p.set('status', params.status);
        if (params.page) p = p.set('page', String(params.page));
        if (params.limit) p = p.set('limit', String(params.limit));
        return this.http.get<any>(`${this.base}/payment-reminders/logs`, { params: p });
    }

    // ── Follow-up Sequences ─────────────────────────────────────
    listFollowupSequences(): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/followup-sequences`);
    }
    getFollowupSequence(id: number | string): Observable<any> {
        return this.http.get<any>(`${this.base}/followup-sequences/${id}`);
    }
    createFollowupSequence(body: any): Observable<any> {
        return this.http.post<any>(`${this.base}/followup-sequences`, body);
    }
    updateFollowupSequence(id: number | string, body: any): Observable<any> {
        return this.http.patch<any>(`${this.base}/followup-sequences/${id}`, body);
    }
    deleteFollowupSequence(id: number | string): Observable<{ ok: boolean }> {
        return this.http.delete<{ ok: boolean }>(`${this.base}/followup-sequences/${id}`);
    }

    // ── Booking Tasks ───────────────────────────────────────────
    listBookingTaskTemplates(): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/booking-tasks/templates`);
    }
    createBookingTaskTemplate(body: any): Observable<any> {
        return this.http.post<any>(`${this.base}/booking-tasks/templates`, body);
    }
    updateBookingTaskTemplate(id: number | string, body: any): Observable<any> {
        return this.http.patch<any>(`${this.base}/booking-tasks/templates/${id}`, body);
    }
    deleteBookingTaskTemplate(id: number | string): Observable<{ ok: boolean }> {
        return this.http.delete<{ ok: boolean }>(`${this.base}/booking-tasks/templates/${id}`);
    }
    listBookingTasks(bookingId: number | string): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/booking-tasks/booking/${bookingId}`);
    }
    createBookingTask(body: any): Observable<any> {
        return this.http.post<any>(`${this.base}/booking-tasks`, body);
    }
    toggleBookingTask(id: number | string): Observable<{ ok: boolean }> {
        return this.http.post<{ ok: boolean }>(`${this.base}/booking-tasks/${id}/toggle`, {});
    }
    deleteBookingTask(id: number | string): Observable<{ ok: boolean }> {
        return this.http.delete<{ ok: boolean }>(`${this.base}/booking-tasks/${id}`);
    }

    // ── GST Reports ─────────────────────────────────────────────
    getGstReport(from: string, to: string): Observable<any> {
        let p = new HttpParams().set('from', from).set('to', to);
        return this.http.get<any>(`${this.base}/reports/gst`, { params: p });
    }
}
