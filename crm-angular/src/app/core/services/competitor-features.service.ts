import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SupplierService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/suppliers';

    list(): Observable<any[]> { return this.http.get<any[]>(this.base); }
    create(body: any): Observable<any> { return this.http.post(this.base, body); }
    update(id: number, body: any): Observable<any> { return this.http.patch(`${this.base}/${id}`, body); }
    delete(id: number): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class TaskService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/tasks';

    list(): Observable<any[]> { return this.http.get<any[]>(this.base); }
    create(body: any): Observable<any> { return this.http.post(this.base, body); }
    update(id: number, body: any): Observable<any> { return this.http.patch(`${this.base}/${id}`, body); }
    delete(id: number): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class ItineraryService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/itineraries';

    list(): Observable<any[]> { return this.http.get<any[]>(this.base); }
    create(body: any): Observable<any> { return this.http.post(this.base, body); }
    get(id: number): Observable<any> { return this.http.get(`${this.base}/${id}`); }
    update(id: number, body: any): Observable<any> { return this.http.patch(`${this.base}/${id}`, body); }
    delete(id: number): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
    addDay(id: number, body: any): Observable<any> { return this.http.post(`${this.base}/${id}/days`, body); }
    updateDay(id: number, dayId: number, body: any): Observable<any> { return this.http.patch(`${this.base}/${id}/days/${dayId}`, body); }
    deleteDay(id: number, dayId: number): Observable<any> { return this.http.delete(`${this.base}/${id}/days/${dayId}`); }
}

@Injectable({ providedIn: 'root' })
export class TravellerService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/travellers';

    list(): Observable<any[]> { return this.http.get<any[]>(this.base); }
    create(body: any): Observable<any> { return this.http.post(this.base, body); }
    update(id: number, body: any): Observable<any> { return this.http.patch(`${this.base}/${id}`, body); }
    delete(id: number): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class ReminderService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/reminders';

    list(params?: { status?: string; priority?: string; assigned_to?: number; today?: string; date_from?: string; date_to?: string }): Observable<any[]> {
        let p = new HttpParams();
        if (params?.status) p = p.set('status', params.status);
        if (params?.priority) p = p.set('priority', params.priority);
        if (params?.assigned_to) p = p.set('assigned_to', String(params.assigned_to));
        if (params?.today) p = p.set('today', params.today);
        if (params?.date_from) p = p.set('date_from', params.date_from);
        if (params?.date_to) p = p.set('date_to', params.date_to);
        return this.http.get<any[]>(this.base, { params: p });
    }
    create(body: any): Observable<any> { return this.http.post(this.base, body); }
    update(id: number, body: any): Observable<any> { return this.http.patch(`${this.base}/${id}`, body); }
    dismiss(id: number): Observable<any> { return this.http.post(`${this.base}/${id}/dismiss`, {}); }
    delete(id: number): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class WhatsappService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/whatsapp';

    getConfig(): Observable<any> { return this.http.get(`${this.base}/config`); }
    saveConfig(body: any): Observable<any> { return this.http.post(`${this.base}/config`, body); }
    sendMessage(body: any): Observable<any> { return this.http.post(`${this.base}/send`, body); }
}

@Injectable({ providedIn: 'root' })
export class FixedDepartureService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/fixed-departures';

    list(): Observable<any[]> { return this.http.get<any[]>(this.base); }
    create(body: any): Observable<any> { return this.http.post(this.base, body); }
    update(id: number, body: any): Observable<any> { return this.http.patch(`${this.base}/${id}`, body); }
    delete(id: number): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class VisaService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/visas';

    list(): Observable<any[]> { return this.http.get<any[]>(this.base); }
    create(body: any): Observable<any> { return this.http.post(this.base, body); }
    update(id: number, body: any): Observable<any> { return this.http.patch(`${this.base}/${id}`, body); }
    delete(id: number): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class CurrencyService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/currencies';

    list(): Observable<any[]> { return this.http.get<any[]>(this.base); }
    create(body: any): Observable<any> { return this.http.post(this.base, body); }
    update(id: number, body: any): Observable<any> { return this.http.patch(`${this.base}/${id}`, body); }
    delete(id: number): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class LandingPageService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/landing-pages';

    list(): Observable<any[]> { return this.http.get<any[]>(this.base); }
    create(body: any): Observable<any> { return this.http.post(this.base, body); }
    get(id: number): Observable<any> { return this.http.get(`${this.base}/${id}`); }
    update(id: number, body: any): Observable<any> { return this.http.patch(`${this.base}/${id}`, body); }
    delete(id: number): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class EmailCampaignService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/email-campaigns';

    list(): Observable<any[]> { return this.http.get<any[]>(this.base); }
    create(body: any): Observable<any> { return this.http.post(this.base, body); }
    update(id: number, body: any): Observable<any> { return this.http.patch(`${this.base}/${id}`, body); }
    delete(id: number): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class B2BService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/b2b';

    listMarketplace(): Observable<any> { return this.http.get<any>(`${this.base}/marketplace`); }
    shareItem(body: { type: string, id: number, share: boolean }): Observable<any> { return this.http.post(`${this.base}/share`, body); }
    importItem(body: { type: string, id: number }): Observable<any> { return this.http.post(`${this.base}/import`, body); }
}

@Injectable({ providedIn: 'root' })
export class GDSService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/gds';

    searchFlights(params: any): Observable<any> { return this.http.get<any>(`${this.base}/flights`, { params }); }
    searchHotels(params: any): Observable<any> { return this.http.get<any>(`${this.base}/hotels`, { params }); }
}

@Injectable({ providedIn: 'root' })
export class FlyerService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/flyers';

    list(): Observable<any[]> { return this.http.get<any[]>(this.base); }
    get(id: number): Observable<any> { return this.http.get<any>(`${this.base}/${id}`); }
    create(body: any): Observable<any> { return this.http.post(this.base, body); }
    update(id: number, body: any): Observable<any> { return this.http.put(`${this.base}/${id}`, body); }
    delete(id: number): Observable<any> { return this.http.delete(`${this.base}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/reports';

    getSalesByAgent(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/sales-by-agent`); }
    getSalesByDestination(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/sales-by-destination`); }
    getLeadSources(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/lead-sources`); }
    getMonthlyRevenue(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/monthly-revenue`); }
    getPackagePerformance(): Observable<any[]> { return this.http.get<any[]>(`${this.base}/package-performance`); }
}
