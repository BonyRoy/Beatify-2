# EmailJS OTP Setup for Song Requests

Song requests now require email verification via OTP. Follow these steps to configure EmailJS.

## 1. Create EmailJS Account

1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account
3. Add an **Email Service** (e.g., Gmail) in the dashboard

## 2. Create Email Template

1. In EmailJS Dashboard → **Email Templates** → **Create New Template**
2. Set the template content. Example:

**Subject:**
```
Your Beatify Song Request OTP: {{otp}}
```

**Content (HTML):**
```html
<p>Hi {{user_name}},</p>
<p>Your OTP for submitting a song request on Beatify is:</p>
<h2 style="letter-spacing: 4px;">{{otp}}</h2>
<p>This OTP expires in 10 minutes. Do not share it with anyone.</p>
<p>If you didn't request this, you can ignore this email.</p>
<p>— Beatify</p>
```

3. **Template Variables** – Ensure your template uses these variable names (they are passed from the app):
   - `{{to_email}}` – Recipient email (optional, for BCC or dynamic recipient)
   - `{{user_name}}` – User's name
   - `{{otp}}` – 6-digit OTP code

4. Set **To Email** in the template to `{{to_email}}` if you want the email sent to the user's address. Or use a fixed "reply-to" and the template will still show the OTP.

   **Note:** EmailJS free tier sends from your connected email. The `to_email` variable lets you send TO the user. Add it to the "To" field in the template settings.

## 3. Get Your Credentials

From the EmailJS Dashboard:
- **Service ID** – Email Services → your service
- **Template ID** – Email Templates → your template
- **Public Key** – Account → API Keys

## 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

Restart the dev server after adding/updating `.env`.

## 5. Firebase Firestore Rules

Add a rule for the `songRequestOtps` collection (OTPs are stored temporarily):

```javascript
// In Firebase Console → Firestore → Rules
match /songRequestOtps/{document} {
  allow read, write: if true;  // Or restrict as needed for your app
}
```

## Flow Summary

1. User fills the song request form (including email)
2. User clicks **Send OTP** → OTP is generated, saved in Firebase, and emailed via EmailJS
3. User enters the 6-digit OTP and clicks **Verify & Submit**
4. OTP is validated against Firebase; if valid, the song request is submitted and the OTP is deleted
