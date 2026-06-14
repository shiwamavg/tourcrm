import { Injectable, inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

export const portalInterceptor: HttpInterceptorFn = (req, next) => {
    const token = localStorage.getItem('portal_token');
    if (req.url.includes('/api/portal') && token) {
        return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
    }
    return next(req);
};
