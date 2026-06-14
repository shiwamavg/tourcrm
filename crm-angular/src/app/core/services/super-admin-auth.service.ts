import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

const SA_TOKEN_KEY = 'sa_token';

@Injectable({ providedIn: 'root' })
export class SuperAdminAuthService {
    private http = inject(HttpClient);
    private router = inject(Router);
    private base = 'http://localhost:3000/api/super-admin';

    private _token = signal<string | null>(localStorage.getItem(SA_TOKEN_KEY));
    isAuthenticated = () => !!this._token();

    login(email: string, password: string): Observable<{ access_token: string; admin: any }> {
        return this.http.post<{ access_token: string; admin: any }>(`${this.base}/login`, { email, password })
            .pipe(tap(res => {
                localStorage.setItem(SA_TOKEN_KEY, res.access_token);
                this._token.set(res.access_token);
            }));
    }

    logout(): void {
        localStorage.removeItem(SA_TOKEN_KEY);
        this._token.set(null);
        this.router.navigate(['/super-admin/login']);
    }

    getToken(): string | null { return this._token(); }
}
