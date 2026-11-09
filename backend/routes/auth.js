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
    { sub: user.id, email: user.email },
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

router.put('/settings', authenticate, async (req, res) => {
  const settings = {
    ...(req.user.settings || {}),
    bloodlineOnly: Boolean(req.body.bloodlineOnly),
  };
  if (req.body.showFormerSpouses !== undefined) {
    settings.showFormerSpouses = Boolean(req.body.showFormerSpouses);
  }
  req.user.settings = settings;
  await req.user.save();

  return res.json({ user: publicUser(req.user) });
});

module.exports = router;
