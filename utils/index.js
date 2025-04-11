export const transformToCapitalize = (text) => {

  // Split the text into an array of words
  const words = text?.split('-');

  // Capitalize the first letter of each word and join them with a space
  const capitalizedWords = words?.map(word => {
    return word?.charAt(0).toUpperCase() + word.slice(1);
  });

  // Join the words with a space and return the result
  return capitalizedWords?.join(' ');
};

export const removeDuplicateConsecutiveChars = (text) => {
  if (!text) return text;

  let result = '';
  let prevChar = '';

  for (let i = 0; i < text.length; i++) {
      let char = text[i];
      if (char !== prevChar) {
          result += char;
          prevChar = char;
      }
  }

  return result;
};

export const parseCookie = (cookieHeader) => {
  const cookies = {};
  cookieHeader?.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts.shift().trim();
      const value = decodeURIComponent(parts.join('='));
      cookies[name] = value;
  });
  return cookies;
};

// Convert buffer to data URI
export function bufferToDataUri(file) {
  const base64 = file?.buffer.toString('base64');
  const mimeType = file.mimetype;
  return `data:${mimeType};base64,${base64}`;
};

// Parse Cookie from request header
export const parseCookies = (request) => {
  const list = {},
      rc = request.headers.cookie;
  rc && rc.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
};

// function for generating pagination
export function generatePaginationRange(currentPage, totalPages) {
  const rangeSize = 5; // Display 5 pages at once
  const pageNumbers = [];

  // If totalPages is less than rangeSize, just return the totalPages
  if (totalPages <= rangeSize) {
      for (let i = 1; i <= totalPages; i++) {
          pageNumbers.push(i);
      }
      pageNumbers.push(totalPages);
  } else {
      // Show first 5 pages or so
      let startPage = Math.max(currentPage - Math.floor(rangeSize / 2), 1);
      let endPage = startPage + rangeSize - 1;

      if (endPage > totalPages) {
          endPage = totalPages;
          startPage = Math.max(endPage - rangeSize + 1, 1);
      }

      // Add the page numbers in the range
      for (let i = startPage; i <= endPage; i++) {
          pageNumbers.push(i);
      }

      // Ensure the last page number is always included
      if (pageNumbers[pageNumbers.length - 1] !== totalPages) {
          pageNumbers.push(totalPages);
      }
  }

  return pageNumbers;
};


export const logger = {
  log: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(...args);
    }
  },
  error: (...args) => {
    console.error(...args); // Errors chhodo nahi, prod mein bhi dikhna chahiye
  }
};


// User Ip Handler 
export const handleUserIp = (req)=>{
  try {
    if (!req) {
      return null;
      
    };
    
    let ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '0.0.0.0';

    if (ip.includes('::ffff:')) ip = ip.split('::ffff:')[1];
    if (ip === '::1' || ip === '127.0.0.1') ip = '0.0.0.0'; // Localhost fallback

    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1)$/;

    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
        return null;
    };

  return ip;

  } catch (error) {
    return null
  }
}


