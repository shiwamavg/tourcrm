// ─────────────────────────────────────────────────────────────────
// src/app/core/services/auth.service.ts
// ─────────────────────────────────────────────────────────────────
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StaffUser {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'telecaller' | 'accounts';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private router = inject(Router);
    private http = inject(HttpClient);

    currentUser = signal<StaffUser | null>(this.loadUser());
    isLoggedIn = signal<boolean>(!!localStorage.getItem('crm_token'));

    login(email: string, password: string) {
        return this.http.post<{ access_token: string; refresh_token: string; user: StaffUser }>(
            `${environment.apiUrl}/auth/login`, { email, password }
        ).pipe(tap(res => {
            localStorage.setItem('crm_token', res.access_token);
            localStorage.setItem('crm_refresh', res.refresh_token);
            localStorage.setItem('crm_user', JSON.stringify(res.user));
            this.currentUser.set(res.user);
            this.isLoggedIn.set(true);
        }));
    }

    logout() {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_refresh');
        localStorage.removeItem('crm_user');
        this.currentUser.set(null);
        this.isLoggedIn.set(false);
        this.router.navigate(['/login']);
    }

    getToken(): string | null { return localStorage.getItem('crm_token'); }

    hasRole(roles: string[]): boolean {
        const user = this.currentUser();
        return user ? roles.includes(user.role) : false;
    }

    private loadUser(): StaffUser | null {
        try { return JSON.parse(localStorage.getItem('crm_user') || 'null'); }
        catch { return null; }
    }
}


// ─────────────────────────────────────────────────────────────────
// src/app/core/interceptors/jwt.interceptor.ts
// ─────────────────────────────────────────────────────────────────
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
    const token = localStorage.getItem('crm_token');

    const authReq = token
        ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
        : req;

    return next(authReq).pipe(
        catchError((err: HttpErrorResponse) => {
            if (err.status === 401) {
                localStorage.clear();
                window.location.href = '/login';
            }
            return throwError(() => err);
        })
    );
};


// ─────────────────────────────────────────────────────────────────
// src/app/core/guards/auth.guard.ts
// ─────────────────────────────────────────────────────────────────
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.isLoggedIn()) return true;
    return router.createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.hasRole(['admin'])) return true;
    return router.createUrlTree(['/dashboard']);
};
