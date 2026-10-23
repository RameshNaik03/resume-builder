import { Resend } from "resend";

// Sends an email through Resend (https://resend.com).
// Without RESEND_API_KEY (e.g. while developing) the email is printed to the
// terminal instead, so features like "forgot password" still work locally.
const sendEmail = async ({ to, subject, text, html }) => {
  // Read at send time (not import time), so the key from .env is always picked up
  if (!process.env.RESEND_API_KEY) {
    console.log(`\n--- Email (RESEND_API_KEY not set, not sent) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---\n`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Resend returns { error } instead of throwing, so turn it into a thrown error
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Resume Builder <onboarding@resend.dev>",
    to,
    subject,
    text,
    html,
  });
  if (error) throw new Error(`Resend: ${error.name}: ${error.message}`);
};

export default sendEmail;
