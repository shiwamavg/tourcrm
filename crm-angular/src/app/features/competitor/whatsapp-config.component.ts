import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WhatsappService } from '../../core/services/competitor-features.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-whatsapp-config',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <h1>WhatsApp Integration</h1>
    @if (config(); as c) {
    <div class="form-panel">
        <label>Provider
            <select [(ngModel)]="form.provider">
                <option value="twilio">Twilio</option>
                <option value="whatsapp_business_api">WhatsApp Business API</option>
                <option value="wati">WATI</option>
                <option value="messagebird">MessageBird</option>
            </select>
        </label>
        <label>API Key <input type="text" [(ngModel)]="form.api_key" /></label>
        <label>API Secret <input type="text" [(ngModel)]="form.api_secret" /></label>
        <label>Phone Number <input type="text" [(ngModel)]="form.phone_number" placeholder="e.g. +919876543210" /></label>
        <label>Webhook URL <input type="url" [(ngModel)]="form.webhook_url" /></label>
        <label>Welcome Message <textarea [(ngModel)]="form.welcome_message" rows="2" placeholder="First message sent to new contacts"></textarea></label>
        <label style="flex-direction:row;align-items:center;gap:8px;">
            <input type="checkbox" [(ngModel)]="enabled" /> Enabled
        </label>
        <div class="form-actions">
            <button class="btn" (click)="save()" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
        </div>
    </div>
    <div class="card">
        <h3>Send Test Message</h3>
        <label>To <input type="text" [(ngModel)]="testTo" placeholder="+919876543210" /></label>
        <label>Message <textarea [(ngModel)]="testMsg" rows="2"></textarea></label>
        <button class="btn" (click)="sendTest()" [disabled]="sending()">{{ sending() ? 'Sending…' : 'Send' }}</button>
    </div>
    } @else { <div>Loading…</div> }
    `,
    styles: [`
        h1 { margin:0 0 14px; font-size:1.3rem; }
        .form-panel { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; margin-bottom:14px; max-width:540px; }
        .form-panel label { display:flex; flex-direction:column; gap:4px; margin-bottom:10px; font-size:12px; color:#374151; }
        .form-panel input, .form-panel select, .form-panel textarea { padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; }
        .form-actions { display:flex; gap:8px; }
        .btn { padding:8px 12px; border:none; border-radius:6px; background:#0f766e; color:#fff; cursor:pointer; font-size:13px; }
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:14px; max-width:540px; }
        .card h3 { margin:0 0 10px; font-size:14px; }
    `]
})
export class WhatsappConfigComponent implements OnInit {
    private api = inject(WhatsappService);
    private toast = inject(ToastService);

    config = signal<any>(null);
    saving = signal(false);
    sending = signal(false);
    enabled = false;
    testTo = '';
    testMsg = '';
    form: any = { provider: 'twilio', api_key: '', api_secret: '', phone_number: '', webhook_url: '', welcome_message: '' };

    ngOnInit() {
        this.api.getConfig().subscribe(c => {
            this.config.set(c);
            this.form = { ...c };
            this.enabled = !!c.enabled;
        });
    }

    save() {
        this.saving.set(true);
        this.api.saveConfig({ ...this.form, enabled: this.enabled }).subscribe({
            next: () => { this.saving.set(false); this.toast.success('Config saved'); },
            error: () => { this.saving.set(false); this.toast.error('Failed'); }
        });
    }

    sendTest() {
        if (!this.testTo) { this.toast.error('Enter a phone number'); return; }
        this.sending.set(true);
        this.api.sendMessage({ to: this.testTo, message: this.testMsg || 'Test message from Tour CRM' }).subscribe({
            next: () => { this.sending.set(false); this.toast.success('Message sent'); },
            error: () => { this.sending.set(false); this.toast.error('Failed'); }
        });
    }
}
