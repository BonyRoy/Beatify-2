import emailjs from "@emailjs/browser";

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/**
 * Send OTP to user's email via EmailJS
 * @param {string} userEmail - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's name (for personalization)
 * @returns {Promise<void>}
 */
export async function sendOtpEmail(userEmail, otp, userName = "User") {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    throw new Error(
      "EmailJS is not configured. Add VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY to your .env file."
    );
  }

  emailjs.init(EMAILJS_PUBLIC_KEY);

  const templateParams = {
    to_email: userEmail,
    user_name: userName,
    otp: otp,
  };

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    templateParams,
    { publicKey: EMAILJS_PUBLIC_KEY }
  );
}
