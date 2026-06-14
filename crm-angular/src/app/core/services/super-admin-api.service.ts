import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SuperAdminApiService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/super-admin';

    // Dashboard
    dashboardStats(): Observable<any> {
        return this.http.get(`${this.base}/dashboard-stats`);
    }

    // Companies
    listCompanies(params: { q?: string; status?: string; subscription_status?: string; page?: number; limit?: number } = {}): Observable<any> {
        let p = new HttpParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
        }
        return this.http.get(`${this.base}/companies`, { params: p });
    }
    getCompany(id: number | string): Observable<any> {
        return this.http.get(`${this.base}/companies/${id}`);
    }
    createCompany(body: any): Observable<any> {
        return this.http.post(`${this.base}/companies`, body);
    }
    updateCompany(id: number | string, body: any): Observable<any> {
        return this.http.patch(`${this.base}/companies/${id}`, body);
    }
    toggleCompanyStatus(id: number | string, status: string): Observable<any> {
        return this.http.post(`${this.base}/companies/${id}/toggle-status`, { status });
    }

    // Packages
    listPackages(): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/packages`);
    }
    createPackage(body: any): Observable<any> {
        return this.http.post(`${this.base}/packages`, body);
    }
    updatePackage(id: number | string, body: any): Observable<any> {
        return this.http.patch(`${this.base}/packages/${id}`, body);
    }

    // Payments
    listPayments(params: { company_id?: number; status?: string; page?: number; limit?: number } = {}): Observable<any> {
        let p = new HttpParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
        }
        return this.http.get(`${this.base}/payments`, { params: p });
    }
    createPayment(body: any): Observable<any> {
        return this.http.post(`${this.base}/payments`, body);
    }

    // Invoices
    listInvoices(params: { company_id?: number; status?: string; page?: number; limit?: number } = {}): Observable<any> {
        let p = new HttpParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
        }
        return this.http.get(`${this.base}/invoices`, { params: p });
    }
    createInvoice(body: any): Observable<any> {
        return this.http.post(`${this.base}/invoices`, body);
    }
    updateInvoice(id: number | string, body: any): Observable<any> {
        return this.http.patch(`${this.base}/invoices/${id}`, body);
    }
    invoicePdfUrl(id: number | string): string {
        return `${this.base}/invoices/${id}/download`;
    }
    paymentPdfUrl(id: number | string): string {
        return `${this.base}/payments/${id}/invoice/download`;
    }


    // Reports
    revenueReport(year?: number): Observable<any[]> {
        let p = new HttpParams();
        if (year) p = p.set('year', String(year));
        return this.http.get<any[]>(`${this.base}/reports/revenue`, { params: p });
    }

    getMonitorMetrics(): Observable<any> {
        return this.http.get('http://localhost:3000/api/monitor/metrics');
    }

    listLoginLogs(params: { company_id?: number; status?: string; email?: string; page?: number; limit?: number } = {}): Observable<any> {
        let p = new HttpParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
        }
        return this.http.get(`${this.base}/login-logs`, { params: p });
    }

    listActivityLogs(params: { company_id?: number; action?: string; entity_type?: string; user_id?: number; page?: number; limit?: number } = {}): Observable<any> {
        let p = new HttpParams();
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
        }
        return this.http.get(`${this.base}/activity-logs`, { params: p });
    }
}
