const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');
    
    // Legacy support: Map string 'admin_id' to a valid 24-char hex ObjectId
    if (decoded.id === 'admin_id' || decoded._id === 'admin_id') {
      const validId = '000000000000000000000001';
      decoded.id = validId;
      decoded._id = validId;
    }
    
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

// Role-based protection helper
const authorizeRoles = (...roles) => {
  return function roleGuard(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }
    return next();
  };
};

module.exports = { authMiddleware, authorizeRoles };
