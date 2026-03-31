const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function optionalAuthMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      // No token provided - create a guest user ID
      req.user = { _id: 'guest-' + Date.now(), isGuest: true };
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (err) {
      // Invalid token - treat as guest
      req.user = { _id: 'guest-' + Date.now(), isGuest: true };
      return next();
    }

    // Try to find user in database
    const user = await User.findById(decoded.id);
    if (!user) {
      // User not found - use decoded id as fallback
      req.user = { _id: decoded.id, isGuest: true };
      return next();
    }

    // User found
    req.user = user;
    next();
  } catch (err) {
    console.error('Optional auth middleware error:', err);
    // Even on error, allow request to proceed as guest
    req.user = { _id: 'guest-' + Date.now(), isGuest: true };
    next();
  }
};
