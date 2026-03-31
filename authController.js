const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Configure nodemailer transporter (use env vars for real credentials)
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.ethereal.email',
  port: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT) : 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Helper to generate JWT token
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Helper to send OTP email
const sendOTPEmail = async (email, otp, purpose) => {
  const mailOptions = {
    from: process.env.MAIL_FROM || 'no-reply@example.com',
    to: email,
    subject: `${purpose} OTP Verification`,
    text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
  };
  await transporter.sendMail(mailOptions);
};

// Register new user and send verification OTP
exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  // Basic input validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields (username, email, password) are required' });
  }
  try {
    // Check for existing email
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    // Check for existing username
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    const user = new User(username, email, password);
    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationOTP = otp;
    user.verificationOTPExpires = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();
    try {
      await sendOTPEmail(email, otp, 'Email Verification');
    } catch (mailErr) {
      // Log email failure but do not block registration
      console.error('Failed to send verification email:', mailErr);
    }
    res.status(201).json({ message: 'User registered, OTP sent' });
  } catch (err) {
    console.error(err);
    // Handle duplicate key error from MongoDB (e.g., race condition)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const msg = field === 'email' ? 'Email already in use' : 'Username already taken';
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: err.message });
  }
};

// Verify email OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.verificationOTP !== otp || Date.now() > user.verificationOTPExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    await User.findOneAndUpdate({ email }, { $unset: { verificationOTP: 1, verificationOTPExpires: 1 } });
    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ message: 'Email verified', user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for email:', email);
  
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    console.log('User found:', !!user);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create temporary user instance to use matchPassword method
    const tempUser = new User(user.username, user.email, user.password);
    console.log('Temp user created, attempting password match');
    
    const match = await tempUser.matchPassword(password);
    console.log('Password match result:', match);
    
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    console.log('Token generated:', !!token);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    console.log('Cookie set, user logged in');
    
    res.json({ message: 'Logged in', user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Forgot password - send reset OTP
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await User.findOneAndUpdate({ email }, { $set: { resetOTP: otp, resetOTPExpires: Date.now() + 10 * 60 * 1000 } });
    await sendOTPEmail(email, otp, 'Password Reset');
    res.json({ message: 'Reset OTP sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Reset password using OTP
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.resetOTP !== otp || Date.now() > user.resetOTPExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await User.findOneAndUpdate({ email }, { $set: { password: hashedPassword }, $unset: { resetOTP: 1, resetOTPExpires: 1 } });
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Logout - clear cookie
exports.logout = (req, res) => {
  res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
  res.json({ message: 'Logged out' });
};