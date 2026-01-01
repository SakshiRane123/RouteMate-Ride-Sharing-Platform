const jwt = require('jsonwebtoken');
const pool = require('../db');

const authenticateToken = async (req, res, next) => {
  let token;

  // Check 1: Look for token in the Authorization header (for API requests)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } 
  // Check 2: Look for token in cookies (for browser requests from EJS pages)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // If no token found in either location, send error
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch fresh user data from the DB
    const [users] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      return res.status(403).json({ error: 'User no longer exists' });
    }

    // Attach the user information to the request object
    req.user = users[0];
    next(); // Proceed to the next middleware/route handler

  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = authenticateToken;