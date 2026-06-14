import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models';

@Injectable({ providedIn: 'root' })
export class StaffService {
    private http = inject(HttpClient);
    private base = environment.apiUrl;

    private _staff = signal<User[]>([]);
    staff = this._staff.asReadonly();
    private _loaded = signal(false);

    load(): Observable<User[]> {
        // Use the auth/me endpoint as a proxy; in a real app you'd have /api/staff
        // For now we try to fetch from a generic endpoint if it exists
        return this.http.get<User[]>(`${this.base}/admin/staff`);
    }

    getCached(): User[] {
        return this._staff();
    }

    setStaff(users: User[]) {
        this._staff.set(users);
        this._loaded.set(true);
    }
}
