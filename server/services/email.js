const nodemailer = require('nodemailer');
const crypto = require('crypto');

// ── Transporter Setup ──
// Uses Gmail SMTP with App Password, or falls back to a test account (Ethereal).
let transporter;
let emailReady = false;

async function initTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    try {
      await transporter.verify();
      emailReady = true;
      console.log(`[email] Gmail SMTP ready (${user})`);
    } catch (err) {
      console.warn('[email] Gmail SMTP failed:', err.message);
      emailReady = false;
    }
  } else {
    console.log('[email] No SMTP_USER/SMTP_PASS in .env — email verification will auto-approve accounts.');
    emailReady = false;
  }
}

// Initialize on import
initTransporter();

// ── Token Generation ──
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ── Send Verification Email ──
async function sendVerificationEmail(toEmail, toName, token) {
  if (!emailReady) {
    console.log(`[email] SMTP not configured — skipping email to ${toEmail}`);
    return false;
  }

  const verifyUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify?token=${token}`;

  const html = `
    <div style="max-width:480px; margin:0 auto; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#0d0d0d; border-radius:16px; overflow:hidden; border:1px solid rgba(147,51,234,0.2);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#7c3aed,#9333ea); padding:32px 24px; text-align:center;">
        <div style="font-size:28px; font-weight:800; color:#fff; letter-spacing:-0.5px;">
          Life<span style="color:#e9d5ff;">OS</span>
        </div>
        <p style="color:rgba(255,255,255,0.7); font-size:13px; margin-top:4px;">Your life, beautifully organized</p>
      </div>
      
      <!-- Body -->
      <div style="padding:32px 24px; background:#111;">
        <h2 style="color:#f5f5f5; font-size:18px; margin:0 0 8px;">Welcome, ${toName}! 👋</h2>
        <p style="color:#a0a0a0; font-size:14px; line-height:1.6; margin:0 0 24px;">
          Thanks for signing up for LifeOS. Please verify your email address to activate your account.
        </p>
        
        <!-- CTA Button -->
        <div style="text-align:center; margin:24px 0;">
          <a href="${verifyUrl}" 
             style="display:inline-block; padding:14px 36px; background:linear-gradient(135deg,#7c3aed,#9333ea); color:#fff; text-decoration:none; border-radius:12px; font-weight:600; font-size:14px; box-shadow:0 8px 24px rgba(147,51,234,0.3);">
            Verify Email Address
          </a>
        </div>
        
        <p style="color:#666; font-size:12px; line-height:1.5; margin-top:24px;">
          If the button doesn't work, copy and paste this link into your browser:
          <br>
          <a href="${verifyUrl}" style="color:#9333ea; word-break:break-all;">${verifyUrl}</a>
        </p>
        
        <p style="color:#666; font-size:12px; margin-top:16px;">
          This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="padding:16px 24px; background:#0a0a0a; text-align:center; border-top:1px solid rgba(255,255,255,0.05);">
        <p style="color:#444; font-size:11px; margin:0;">
          © ${new Date().getFullYear()} LifeOS · Sent with ❤️
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"LifeOS" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: 'Verify your LifeOS account ✨',
      html,
    });
    console.log(`[email] Verification sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error(`[email] Failed to send to ${toEmail}:`, err.message);
    return false;
  }
}

module.exports = { generateVerificationToken, sendVerificationEmail, isEmailReady: () => emailReady };
