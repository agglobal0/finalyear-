const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { register, verifyOTP, login, forgotPassword, resetPassword, logout } = require('../controllers/authController');
const User = require('../models/User');

// Register new user (sends verification OTP)
router.post('/register', register);

// Verify email OTP
router.post('/verify-otp', verifyOTP);

// Login
router.post('/login', login);

// Forgot password - send reset OTP
router.post('/forgot-password', forgotPassword);

// Reset password using OTP
router.post('/reset-password', resetPassword);

// Logout
router.post('/logout', logout);

// Get current logged in user
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ user: null });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ user: null });
    }
    res.json({ user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(401).json({ user: null });
  }
});

module.exports = router;