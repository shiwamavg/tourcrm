import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models';

const TOKEN_KEY = 'crm_token';
const USER_KEY = 'crm_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private router = inject(Router);
    private base = environment.apiUrl;

    private _user = signal<User | null>(this.loadUser());
    private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

    user = computed(() => this._user());
    isAuthenticated = computed(() => !!this._token());
    role = computed(() => this._user()?.role);

    login(email: string, password: string): Observable<{ access_token: string; user: User }> {
        return this.http.post<{ access_token: string; user: User }>(`${this.base}/auth/login`, { email, password })
            .pipe(tap(res => {
                localStorage.setItem(TOKEN_KEY, res.access_token);
                localStorage.setItem(USER_KEY, JSON.stringify(res.user));
                this._token.set(res.access_token);
                this._user.set(res.user);
            }));
    }

    signup(body: {
        company_name: string;
        contact_name: string;
        contact_email: string;
        contact_phone?: string;
        password: string;
        website?: string;
        package_id?: number | string;
    }): Observable<any> {
        return this.http.post<any>(`${this.base}/auth/signup`, body);
    }

    verifySignupOtp(email: string, code: string): Observable<any> {
        return this.http.post<any>(`${this.base}/auth/signup/verify`, { email, code });
    }

    resendSignupOtp(email: string): Observable<any> {
        return this.http.post<any>(`${this.base}/auth/signup/resend`, { email });
    }

    listPublicPackages(): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/subscription-packages`);
    }

    logout(): void {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        this._token.set(null);
        this._user.set(null);
        this.router.navigate(['/login']);
    }

    getToken(): string | null { return this._token(); }

    private loadUser(): User | null {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) as User : null;
        } catch { return null; }
    }
}
