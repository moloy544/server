import axios from "axios";
import geoip from "geoip-lite";
import nodemailer from 'nodemailer';

// Primary Geo API Lookup Function
export async function getApiLocationDetails(ip) {
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 3000 });
    const { country, countryCode } = response.data || {};

    if (response.status === 200 && (country || countryCode)) {
      return {
        country: country?.toLowerCase(),
        countryCode: countryCode?.toUpperCase()
      };
    } else {
      //console.warn('Geo lookup returned empty result for:', ip);
      return null;
    }
  } catch (error) {
    //console.error('Geo API error:', error.message);
    return null;
  }
};

export const getUserGeoDetails = (ip) => {

  try {
    if (!ip || ip === '0.0.0.0') {
      return null
    };

    const geoData = geoip.lookup(ip);

    return geoData;

  } catch (error) {
    console.log('Error while getting user GEO details:', error)

  }
};


// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use another email service
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password
  }
});

// Function to send OTP to user's email
export async function sendOtpEmail(email, otp) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Login - DMCA Takedown Panel',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: auto; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #2d3748;">DMCA Takedown Panel Login</h2>
        <p>Hello,</p>
        <p>You’ve requested to log in to the <strong>MoviesBazar DMCA Takedown Panel</strong>.</p>
        <p style="margin-top: 20px; font-size: 18px;">
          <strong>Your OTP:</strong> 
          <span style="font-size: 24px; color: #2b6cb0; font-weight: bold;">${otp}</span>
        </p>
        <p style="color: #555; font-size: 14px; margin-top: 10px;">
          This OTP is valid for <strong>10 minutes</strong>. Please do not share this code with anyone.
        </p>
        <p style="margin-top: 30px; font-size: 13px; color: #888;">
          If you did not request this OTP, please ignore this message or contact our support team.
        </p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #aaa;">&copy; ${new Date().getFullYear()} MoviesBazar DMCA Panel</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}







