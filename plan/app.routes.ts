// ─────────────────────────────────────────────────────────────────
// src/app/app.routes.ts  — Angular 22 standalone routing
// ─────────────────────────────────────────────────────────────────
import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: '',
        loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'leads',
                loadComponent: () => import('./features/leads/lead-list/lead-list.component').then(m => m.LeadListComponent)
            },
            {
                path: 'leads/:id',
                loadComponent: () => import('./features/leads/lead-detail/lead-detail.component').then(m => m.LeadDetailComponent)
            },
            {
                path: 'quotations',
                loadComponent: () => import('./features/quotations/quotation-list/quotation-list.component').then(m => m.QuotationListComponent)
            },
            {
                path: 'quotations/new',
                loadComponent: () => import('./features/quotations/quotation-builder/quotation-builder.component').then(m => m.QuotationBuilderComponent)
            },
            {
                path: 'quotations/:id',
                loadComponent: () => import('./features/quotations/quotation-detail/quotation-detail.component').then(m => m.QuotationDetailComponent)
            },
            {
                path: 'bookings',
                loadComponent: () => import('./features/bookings/booking-list/booking-list.component').then(m => m.BookingListComponent)
            },
            {
                path: 'bookings/:id',
                loadComponent: () => import('./features/bookings/booking-detail/booking-detail.component').then(m => m.BookingDetailComponent)
            },
            {
                path: 'admin',
                canActivate: [adminGuard],
                children: [
                    { path: '', redirectTo: 'destinations', pathMatch: 'full' },
                    {
                        path: 'destinations',
                        loadComponent: () => import('./features/admin/destinations/destinations.component').then(m => m.DestinationsComponent)
                    },
                    {
                        path: 'hotel-rates',
                        loadComponent: () => import('./features/admin/hotel-rates/hotel-rates.component').then(m => m.HotelRatesComponent)
                    },
                    {
                        path: 'car-rates',
                        loadComponent: () => import('./features/admin/car-rates/car-rates.component').then(m => m.CarRatesComponent)
                    },
                    {
                        path: 'users',
                        loadComponent: () => import('./features/admin/users/users.component').then(m => m.UsersComponent)
                    },
                    {
                        path: 'settings',
                        loadComponent: () => import('./features/admin/settings/settings.component').then(m => m.SettingsComponent)
                    }
                ]
            }
        ]
    },
    { path: '**', redirectTo: '' }
];


// ─────────────────────────────────────────────────────────────────
// src/app/app.config.ts
// ─────────────────────────────────────────────────────────────────
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withInterceptors([jwtInterceptor]))
    ]
};
