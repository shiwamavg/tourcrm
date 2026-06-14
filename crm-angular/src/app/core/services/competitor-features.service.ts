import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

    list(): Observable<any[]> { return this.http.get<any[]>(this.base); }
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
