// Define the allowed origins as an array (you can set it from your environment variables as a comma-separated string)
const allowedOrigins = process.env.ALLOW_ORIGIN.split(',');

const checkDirectAccess = async (req, res, next) => {

  try {
      const allowDomain = allowedOrigins;
    
      const origin = req.headers.origin || '';
      const referer = req.headers.referer || '';
    
      if (req.method === 'GET') {
        const isFromFrontend = allowDomain.some(domain => origin.startsWith(domain) || referer.startsWith(domain));
    
        if (!isFromFrontend) {
          return res.status(403).json({ message: 'Unauthorized access.' });
        }
      }
      next();

  } catch (error) {
    console.error("Error in check direct access Middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export { checkDirectAccess };
