// netlify/functions/subscribe.js
//
// Sends the newsletter confirmation email through your own Gmail account
// (via SMTP + nodemailer), instead of Resend's sandbox. This is free and
// works for ANY recipient right away - no domain purchase needed.
//
// SETUP (one time):
// 1. Turn on 2-Step Verification on the Google account you want to send
//    from: myaccount.google.com/security
// 2. Create an "App Password": myaccount.google.com/apppasswords
//    - Pick "Mail" as the app, any device name (e.g. "Netlify site")
//    - Google gives you a 16-character code - copy it
// 3. In Netlify: Site configuration -> Environment variables -> Add:
//    Name: GMAIL_USER            Value: youraddress@gmail.com
//    Name: GMAIL_APP_PASSWORD    Value: (the 16-character code, no spaces)
// 4. Trigger a redeploy so the variables take effect.
//
// Note: a regular Gmail account can send roughly 500 emails/day for free,
// which is far more than a small newsletter signup needs to start.

const nodemailer = require("nodemailer");

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error("Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variable");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Email service is not configured yet." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body." }) };
  }

  const firstName = (body.firstName || "").trim();
  const lastName = (body.lastName || "").trim();
  const email = (body.email || "").trim();

  if (!firstName || !lastName) {
    return { statusCode: 400, body: JSON.stringify({ error: "First and last name are required." }) };
  }
  if (!isValidEmail(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Please enter a valid email address." }) };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Modern Day Cars" <${GMAIL_USER}>`,
      to: email,
      subject: "You're in — Modern Day Cars",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #16181C;">
          <h1 style="font-size: 20px; letter-spacing: 0.04em; text-transform: uppercase;">
            Modern Day <span style="color:#D91E36;">Cars</span>
          </h1>
          <p>Hi ${firstName},</p>
          <p>
            Thanks for signing up. You'll now hear from us occasionally when
            there's a new build, review, or feature worth your time - no
            spam, no daily noise.
          </p>
          <p style="color:#5A616B; font-size: 13px; margin-top: 32px;">
            If you didn't sign up for this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("Subscribe handler error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Something went wrong. Please try again." }) };
  }
};
