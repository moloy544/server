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

