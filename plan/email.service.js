const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.brevo.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.EMAIL_API_KEY
    }
});

const sendOtpEmail = async (email, name, otp) => {
    await transporter.sendMail({
        from: `"${process.env.AGENCY_NAME || 'Travel Agency'}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: 'Your Login OTP',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <h2>Hi ${name || ''},</h2>
                <p>Your one-time password to access your booking portal:</p>
                <div style="background: #f4f4f4; padding: 24px; text-align: center; border-radius: 8px; margin: 24px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
                </div>
                <p style="color: #666; font-size: 14px;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
            </div>
        `
    });
};

const sendBookingConfirmation = async (email, name, booking) => {
    await transporter.sendMail({
        from: `"${process.env.AGENCY_NAME || 'Travel Agency'}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: `Booking Confirmed — ${booking.booking_number}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Booking Confirmed! ✅</h2>
                <p>Dear ${name},</p>
                <p>Your trip to <strong>${booking.destination_text}</strong> is confirmed.</p>
                <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding:8px; color:#666;">Booking No.</td><td style="padding:8px; font-weight:bold;">${booking.booking_number}</td></tr>
                    <tr style="background:#f9f9f9;"><td style="padding:8px; color:#666;">Travel Dates</td><td style="padding:8px;">${booking.trip_start_date} to ${booking.trip_end_date}</td></tr>
                    <tr><td style="padding:8px; color:#666;">Total Amount</td><td style="padding:8px;">₹${parseFloat(booking.total_amount).toLocaleString('en-IN')}</td></tr>
                    <tr style="background:#f9f9f9;"><td style="padding:8px; color:#666;">Amount Paid</td><td style="padding:8px;">₹${parseFloat(booking.total_paid).toLocaleString('en-IN')}</td></tr>
                    <tr><td style="padding:8px; color:#666;">Balance Due</td><td style="padding:8px; color:#e53e3e;">₹${parseFloat(booking.balance_due).toLocaleString('en-IN')}</td></tr>
                </table>
                <p>You can view your full booking and pay the balance at: <a href="${process.env.CUSTOMER_PORTAL_URL}">Customer Portal</a></p>
            </div>
        `
    });
};

const sendQuotationEmail = async (email, name, quotation, pdfBuffer) => {
    await transporter.sendMail({
        from: `"${process.env.AGENCY_NAME || 'Travel Agency'}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: `Your Tour Quotation — ${quotation.quotation_number}`,
        html: `
            <p>Dear ${name},</p>
            <p>Please find your customized tour quotation attached for your trip to <strong>${quotation.destination_text}</strong>.</p>
            <p>Quotation No: <strong>${quotation.quotation_number}</strong></p>
            <p>Valid till: <strong>${quotation.valid_till || 'N/A'}</strong></p>
            <p>If you have any questions, please reach out to us.</p>
        `,
        attachments: pdfBuffer ? [{
            filename: `${quotation.quotation_number}.pdf`,
            content: pdfBuffer
        }] : []
    });
};

module.exports = { sendOtpEmail, sendBookingConfirmation, sendQuotationEmail };
