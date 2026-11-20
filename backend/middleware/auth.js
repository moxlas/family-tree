const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: 'Account no longer exists' });
    }

    // Tokens issued before password versioning are treated as version 0 so
    // existing sessions keep working until their password is changed.
    if ((payload.ver ?? 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};
