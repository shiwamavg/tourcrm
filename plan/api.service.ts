// ─────────────────────────────────────────────────────────────────
// src/app/core/services/api.service.ts
// Central HTTP service for all CRM API calls
// ─────────────────────────────────────────────────────────────────
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
    private http = inject(HttpClient);
    private base = environment.apiUrl;

    // ── Auth ────────────────────────────────────────────────────
    login(email: string, password: string) {
        return this.http.post<{ access_token: string; refresh_token: string; user: any }>(
            `${this.base}/auth/login`, { email, password }
        );
    }
    getMe() { return this.http.get<any>(`${this.base}/auth/me`); }

    // ── Leads ───────────────────────────────────────────────────
    getLeads(params: any = {}) {
        return this.http.get<any>(`${this.base}/leads`, { params });
    }
    getLead(id: string) { return this.http.get<any>(`${this.base}/leads/${id}`); }
    createLead(body: any) { return this.http.post<any>(`${this.base}/leads`, body); }
    updateLeadStatus(id: string, body: any) {
        return this.http.patch<any>(`${this.base}/leads/${id}/status`, body);
    }
    assignLead(id: string, assignedTo: string) {
        return this.http.patch<any>(`${this.base}/leads/${id}/assign`, { assigned_to: assignedTo });
    }
    logFollowUp(leadId: string, body: any) {
        return this.http.post<any>(`${this.base}/leads/${leadId}/follow-ups`, body);
    }
    getTodayReminders() { return this.http.get<any[]>(`${this.base}/leads/reminders/today`); }
    bulkImportLeads(leads: any[]) {
        return this.http.post<any>(`${this.base}/leads/bulk`, { leads });
    }

    // ── Quotations ──────────────────────────────────────────────
    getQuotations(params: any = {}) {
        return this.http.get<any[]>(`${this.base}/quotations`, { params });
    }
    getQuotation(id: string) { return this.http.get<any>(`${this.base}/quotations/${id}`); }
    createQuotation(body: any) { return this.http.post<any>(`${this.base}/quotations`, body); }
    updateQuotationStatus(id: string, status: string) {
        return this.http.patch<any>(`${this.base}/quotations/${id}/status`, { status });
    }
    getHotelRatesForDest(destinationId: string) {
        return this.http.get<any[]>(`${this.base}/quotations/master/hotel-rates`, { params: { destination_id: destinationId } });
    }
    getCarRatesForDest(destinationId: string) {
        return this.http.get<any[]>(`${this.base}/quotations/master/car-rates`, { params: { destination_id: destinationId } });
    }

    // ── Bookings ────────────────────────────────────────────────
    getBookings(params: any = {}) { return this.http.get<any[]>(`${this.base}/bookings`, { params }); }
    getBooking(id: string) { return this.http.get<any>(`${this.base}/bookings/${id}`); }
    createBooking(body: any) { return this.http.post<any>(`${this.base}/bookings`, body); }
    recordOfflinePayment(bookingId: string, body: any) {
        return this.http.post<any>(`${this.base}/bookings/${bookingId}/payments/offline`, body);
    }

    // ── Admin ───────────────────────────────────────────────────
    getDestinations() { return this.http.get<any[]>(`${this.base}/admin/destinations`); }
    createDestination(body: any) { return this.http.post<any>(`${this.base}/admin/destinations`, body); }
    updateDestination(id: string, body: any) { return this.http.patch<any>(`${this.base}/admin/destinations/${id}`, body); }

    getHotelRates(params: any = {}) { return this.http.get<any[]>(`${this.base}/admin/hotel-rates`, { params }); }
    createHotelRate(body: any) { return this.http.post<any>(`${this.base}/admin/hotel-rates`, body); }
    updateHotelRate(id: string, body: any) { return this.http.patch<any>(`${this.base}/admin/hotel-rates/${id}`, body); }

    getCarRates(params: any = {}) { return this.http.get<any[]>(`${this.base}/admin/car-rates`, { params }); }
    createCarRate(body: any) { return this.http.post<any>(`${this.base}/admin/car-rates`, body); }
    updateCarRate(id: string, body: any) { return this.http.patch<any>(`${this.base}/admin/car-rates/${id}`, body); }

    getCarTypes() { return this.http.get<any[]>(`${this.base}/admin/car-types`); }
    getStaffUsers() { return this.http.get<any[]>(`${this.base}/admin/users`); }
    createStaffUser(body: any) { return this.http.post<any>(`${this.base}/admin/users`, body); }

    getSettings() { return this.http.get<any>(`${this.base}/admin/settings`); }
    updateSettings(body: any) { return this.http.patch<any>(`${this.base}/admin/settings`, body); }

    // ── Invoice ─────────────────────────────────────────────────
    getInvoice(bookingId: string) { return this.http.get<any>(`${this.base}/invoices/${bookingId}`); }
}
