import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PortalAuthService {
    private http = inject(HttpClient);
    private router = inject(Router);
    private base = 'http://localhost:3000/api/portal/auth';

    email = signal<string | null>(null);
    private tokenKey = 'portal_token';

    getToken(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    isLoggedIn(): boolean {
        return !!this.getToken();
    }

    sendOtp(email: string): Observable<any> {
        return this.http.post(`${this.base}/send-otp`, { email });
    }

    verifyOtp(email: string, otp: string): Observable<any> {
        return this.http.post(`${this.base}/verify-otp`, { email, otp }).pipe(
            tap((res: any) => {
                localStorage.setItem(this.tokenKey, res.token);
                this.email.set(email);
            })
        );
    }

    logout() {
        localStorage.removeItem(this.tokenKey);
        this.email.set(null);
        this.router.navigate(['/portal']);
    }

    loadEmail() {
        this.http.get<any>('http://localhost:3000/api/portal/me').subscribe({
            next: r => this.email.set(r.email),
            error: () => this.logout()
        });
    }
}
