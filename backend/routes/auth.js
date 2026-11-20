const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticate = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  return jwt.sign(
    { sub: user.id, email: user.email, ver: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    settings: {
      bloodlineOnly: Boolean(user.settings?.bloodlineOnly),
      showFormerSpouses: user.settings?.showFormerSpouses !== false,
      textSize: ['normal', 'large', 'xlarge'].includes(user.settings?.textSize)
        ? user.settings.textSize
        : 'normal',
      highContrast: Boolean(user.settings?.highContrast),
      reducedMotion: Boolean(user.settings?.reducedMotion),
    },
  };
}

router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });

  return res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  const passwordMatches = user
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  if (!user || !passwordMatches) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  return res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.put('/profile', authenticate, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  const existing = await User.findOne({
    email,
    _id: { $ne: req.user.id },
  });

  if (existing) {
    return res
      .status(409)
      .json({ error: 'An account with this email already exists' });
  }

  req.user.name = name;
  req.user.email = email;
  await req.user.save();

  return res.json({ user: publicUser(req.user) });
});

router.put('/password', authenticate, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      error: 'Current password and new password are required',
    });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 6 characters' });
  }

  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) {
    return res.status(401).json({ error: 'Account no longer exists' });
  }

  const passwordMatches = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    return res
      .status(400)
      .json({ error: 'New password must be different from the current one' });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return res.json({ token: signToken(user), user: publicUser(user) });
});

router.put('/settings', authenticate, async (req, res) => {
  const settings = { ...(req.user.settings || {}) };
  if (req.body.bloodlineOnly !== undefined) {
    settings.bloodlineOnly = Boolean(req.body.bloodlineOnly);
  }
  if (req.body.showFormerSpouses !== undefined) {
    settings.showFormerSpouses = Boolean(req.body.showFormerSpouses);
  }
  if (['normal', 'large', 'xlarge'].includes(req.body.textSize)) {
    settings.textSize = req.body.textSize;
  }
  if (req.body.highContrast !== undefined) {
    settings.highContrast = Boolean(req.body.highContrast);
  }
  if (req.body.reducedMotion !== undefined) {
    settings.reducedMotion = Boolean(req.body.reducedMotion);
  }
  req.user.settings = settings;
  await req.user.save();

  return res.json({ user: publicUser(req.user) });
});

module.exports = router;
