import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, // Use 587 if 465 doesn't work
  secure: true, // true for port 465, false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP email
export const sendOTP = async (email: string, otp: string): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Email - ProjeX",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: 'Arial', sans-serif;">
            <tr>
              <td>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px;">
                      <h1 style="margin: 0; font-size: 24px; color: #18181b;">
                        <span style="color: #6366f1;">ProjeX</span>
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 20px 40px;">
                      <h2 style="margin: 0 0 20px; font-size: 20px; color: #18181b;">Verify Your Email Address</h2>
                      <p style="margin: 0 0 10px; font-size: 16px; color: #52525b; line-height: 24px;">
                        Please use the verification code below to complete your email verification:
                      </p>
                      
                      <!-- OTP Code -->
                      <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 30px 0; text-align: center;">
                        <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #4f46e5; letter-spacing: 8px;">
                          ${otp}
                        </span>
                      </div>
                      
                      <p style="margin: 0 0 10px; font-size: 14px; color: #71717a;">
                        This code will expire in 10 minutes for security reasons.
                      </p>
                      
                      <p style="margin: 30px 0 0; font-size: 14px; color: #71717a;">
                        If you didn't request this code, please ignore this email or contact support if you have concerns.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; border-top: 1px solid #e4e4e7;">
                      <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 20px;">
                        This is an automated message from ProjeX. Please do not reply to this email.
                        <br>
                        © ${new Date().getFullYear()} ProjeX. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  }

  await transporter.sendMail(mailOptions)
}

