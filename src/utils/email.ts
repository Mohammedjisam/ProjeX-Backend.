import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false 
    }
  });

  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || 'ProjeX'} <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

export const generatePasswordResetEmailHtml = (
  managerName: string,
  resetLink: string
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Set Your Password</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .email-container {
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 20px;
          margin-top: 20px;
        }
        .header {
          background-color: #4f46e5;
          color: white;
          padding: 10px 20px;
          border-radius: 5px 5px 0 0;
          margin-top: -20px;
          margin-left: -20px;
          margin-right: -20px;
        }
        .button {
          display: inline-block;
          background-color: #1A1F2C;
          color: #FFFFFF;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: 500;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #777;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h2>Welcome to Our Platform!</h2>
        </div>
        <p>Hello ${managerName},</p>
        <p>Your account has been created as a Manager in our system.</p>
        <p>Please click the button below to set up your password:</p>
        <a href="${resetLink}" class="button">Set Your Password</a>
        <p>If the button doesn't work, you can copy and paste the following link in your browser:</p>
        <p>${resetLink}</p>
        <p>This link will expire in 24 hours for security reasons.</p>
        <p>Thank you,<br>ProjeX Team</p>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};