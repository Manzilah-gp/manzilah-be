// emailService.js (or your email service file)
import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to, subject, html) => {
    try {
        const payload = {
            from: 'Manzilah <onboarding@resend.dev>',
            to,
            subject,
            html,
            text: html.replace(/<[^>]*>/g, ''),
        };

        const { data, error } = await resend.emails.send(payload);

        if (error) {
            // Handle Resend Sandbox restriction (403)
            // Error: "You can only send testing emails to your own email address (user@example.com)..."
            if (error.statusCode === 403 && error.message.includes('can only send testing emails to your own email address')) {
                const match = error.message.match(/\(([^)]+)\)/);
                if (match && match[1]) {
                    const allowedEmail = match[1];
                    console.warn(` RESEND SANDBOX: Redirecting email intended for ${to} to allowed test email ${allowedEmail}`);

                    const retryPayload = {
                        ...payload,
                        to: allowedEmail,
                        subject: `[TESTING - Redirected from ${to}] ${subject}`
                    };

                    const retryResponse = await resend.emails.send(retryPayload);

                    if (retryResponse.error) {
                        throw new Error(`Failed to send redirected email: ${retryResponse.error.message}`);
                    }
                    console.log('Email sent successfully (redirected)!');
                    console.log('Email ID:', retryResponse.data?.id);
                    return retryResponse.data;
                }
            }

            console.error('Resend API error:', error);
            throw new Error(`Failed to send email: ${error.message}`);
        }

        console.log('Email sent successfully!');
        console.log('Email ID:', data?.id);
        return data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};