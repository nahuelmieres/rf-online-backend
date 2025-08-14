const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: process.env.FROM_EMAIL || 'no-reply@example.com',
    to,
    subject,
    html
  });
}

module.exports = { transporter, sendMail };