import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PortalApiService {
    private http = inject(HttpClient);
    private base = 'http://localhost:3000/api/portal';

    private headers = { Authorization: `Bearer ${localStorage.getItem('portal_token')}` };

    getMyBookings(): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/bookings`, { headers: this.headers });
    }

    getBooking(id: number): Observable<any> {
        return this.http.get(`${this.base}/bookings/${id}`, { headers: this.headers });
    }

    payBooking(id: number, method: string): Observable<any> {
        return this.http.post(`${this.base}/bookings/${id}/pay`, { payment_method: method }, { headers: this.headers });
    }

    payOffline(id: number, body: any): Observable<any> {
        return this.http.post(`${this.base}/bookings/${id}/pay-offline`, body, { headers: this.headers });
    }

    reviewBooking(id: number, body: any): Observable<any> {
        return this.http.post(`${this.base}/bookings/${id}/review`, body, { headers: this.headers });
    }
}
