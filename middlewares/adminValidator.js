const validateAdmin = async (req, res, next) => {

  try {
    const token = req.cookies?.['admin'];
console.log(token)
    if (!token) {
      return res.status(401).json({ message: 'Admin is Unauthorized' });
    }

    next();

  } catch (error) {
    console.error("Error in admin authentication:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export { validateAdmin };
