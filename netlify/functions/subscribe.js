// netlify/functions/subscribe.js
//
// Netlify Functions version of the newsletter signup handler.
// Sends a confirmation email via Resend when the form is submitted.
//
// SETUP (do this once, after this file is deployed):
// 1. Create a free account at https://resend.com
// 2. Create an API key: Dashboard -> API Keys -> Create API Key
// 3. In Netlify: Site configuration -> Environment variables -> Add a variable
//    Name: RESEND_API_KEY   Value: (the key you copied from Resend)
// 4. Trigger a redeploy (Netlify needs a new deploy to pick up the variable)
// 5. Optional: verify your own domain in Resend, then also add a
//    FROM_EMAIL environment variable, e.g. "Modern Day Cars <hello@yourdomain.com>"

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "Modern Day Cars <onboarding@resend.dev>";

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

  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY environment variable");
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
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
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
              there's a new build, review, or feature worth your time — no
              spam, no daily noise.
            </p>
            <p style="color:#5A616B; font-size: 13px; margin-top: 32px;">
              If you didn't sign up for this, you can safely ignore this email.
            </p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend API error:", resendRes.status, errText);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Couldn't send the confirmation email. Please try again." }),
      };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("Subscribe handler error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Something went wrong. Please try again." }) };
  }
};
