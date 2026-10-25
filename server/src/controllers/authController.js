const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'visteon_super_secure_jwt_secret_key_2026_enterprise_sso',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    const cleanEmail = email ? String(email).toLowerCase().trim() : '';

    console.log(`[Auth] POST /api/auth/login received for email: ${cleanEmail || 'missing'}`);

    // 1. Validate required fields
    if (!cleanEmail || !password) {
      console.warn('[Auth] Login rejected: Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // 2. Check MongoDB connection state before querying
    if (mongoose.connection.readyState !== 1) {
      console.error(`[Auth] Database not connected (readyState: ${mongoose.connection.readyState}). Cannot authenticate.`);
      return res.status(503).json({
        success: false,
        message: 'Database service is temporarily unavailable. Please try again shortly.',
      });
    }

    // 3. Query user by email
    console.log(`[Auth] Querying user record for: ${cleanEmail}`);
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      console.warn(`[Auth] Login rejected: User not found for email ${cleanEmail}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    // 4. Verify account active state
    if (!user.active) {
      console.warn(`[Auth] Login rejected: Account deactivated for email ${cleanEmail}`);
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact administrator.',
      });
    }

    // 5. Verify password hash
    console.log(`[Auth] Verifying credentials for user: ${cleanEmail}`);
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.warn(`[Auth] Login rejected: Incorrect password for email ${cleanEmail}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 6. Generate signed JWT token
    const token = generateToken(user._id);

    console.log(`[Auth] Login successful: ${cleanEmail} (ID: ${user._id}, Role: ${user.role})`);

    // Explicitly guarantee application/json response header
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[Auth Error] Exception in login controller:', err.message);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred during authentication. Please try again.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = req.user || (await User.findById(req.user?.id || req.user?._id));
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User session not found',
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Register a new user (Admin only)
// @route   POST /api/auth/register
// @access  Private/Admin
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: role || 'OPERATOR',
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update password / profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.body.name) {
      user.name = req.body.name;
    }

    if (req.body.newPassword) {
      if (!req.body.currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to change password' });
      }
      const isMatch = await user.matchPassword(req.body.currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }
      user.password = req.body.newPassword;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  getMe,
  register,
  updateProfile,
};
