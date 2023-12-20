const validateOrigin = (req, res, next) => {

    const allowedOrigins = process.env.ALLOW_ORIGIN.split(',').map((origin) => origin.trim());
  
    const requestOrigin = req.headers.origin;
  
    const validateAllowOrigin = allowedOrigins.some((origin) => requestOrigin?.includes(origin));
  
    if (validateAllowOrigin) {
      // If the 'Origin' header matches your domain, allow the request 
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      next();
    } else {
  
      // If the 'Origin' header doesn't match, return a CORS error 
      return res.status(403).json({ error: 'Request is not authorized' });
    }
  };
  
  export { validateOrigin };
  