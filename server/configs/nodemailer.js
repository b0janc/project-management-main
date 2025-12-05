import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com', // Sesuaikan dengan host Anda (misal: Brevo)
    port: 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendEmail = async ({ to, subject, body }) => {
    try {
        const response = await transporter.sendMail({ // PERBAIKAN DI SINI
            from: process.env.SENDER_EMAIL,
            to: to,
            subject: subject,
            html: body 
        });
        return response;
    } catch (error) {
        console.log("Email Error:", error);
        throw error;
    }
}

export default sendEmail;