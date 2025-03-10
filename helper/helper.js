import crypto from "crypto";
import { URL } from "url";  // Ensure to import the 'URL' module for Node.js

// Function to generate a random alphanumeric string token for .txt HLS playlist source
export function generateTokenizeSource(source, ip) {

  // Ensure the source contains ".txt"
  if (!source.includes('.txt')) return source;

  // Create a URL object to manipulate query parameters (no window needed in backend)
  const url = new URL(source, 'http://localhost');  // Temporary origin is required in Node.js
  const tokenExists = url.searchParams.has('token');

  if (tokenExists) {
    // If 'token' is already present, return the source as is
    return source;
  }

  // Generate a random alphanumeric string
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  const charactersLength = characters.length;
  for (let i = 0; i < 100; i++) {  // Length of random string can be adjusted
    randomString += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  // Generate a timestamp (current UNIX timestamp)
  const timestamp = Math.floor(Date.now() / 1000);  // Current time in seconds

  // Generate a cryptographic hash (SHA-256 hash)
  const hash = crypto.createHash('sha256').update(randomString + timestamp + ip).digest('hex');

  // Combine all parts into the final token
  const token = `${randomString}:${timestamp}:${ip}:${hash}`;

  // Append token depending on whether the URL has existing query parameters
  url.searchParams.append('token', token);  // Safely append the token query parameter

  // Return the updated source URL string with the token appended
  return url.toString();
}
