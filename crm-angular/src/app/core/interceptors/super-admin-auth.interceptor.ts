import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SuperAdminAuthService } from '../services/super-admin-auth.service';

export const superAdminAuthInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(SuperAdminAuthService);
    const router = inject(Router);
    const token = auth.getToken();

    // Only intercept super-admin and monitor API calls
    if (!req.url.includes('/api/super-admin') && !req.url.includes('/api/monitor')) {
        return next(req);
    }

    const authed = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

    return next(authed).pipe(
        catchError((err: any) => {
            if (err.status === 401) {
                auth.logout();
                router.navigate(['/super-admin/login']);
            }
            return throwError(() => err);
        })
    );
};
