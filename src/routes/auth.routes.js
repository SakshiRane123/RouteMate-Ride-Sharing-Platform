const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

// Helper function to set JWT as a cookie
const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true, // Important for security
    maxAge: 60 * 60 * 1000 // 1 hour
  });
};

// POST /auth/register - Register new user (now handles form submission)
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    // Check if email exists
    const [existing] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      // Render the index page with an error message
      return res.render('index', { error: 'Email already registered' });
    }

    // Hash password and insert user
    const hashed = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashed, role]
    );

    // On successful registration, redirect to login page
    res.redirect('/?message=Registration successful! Please log in.');

  } catch (err) {
    console.error(err);
    res.render('index', { error: 'Registration failed' });
  }
});

// POST /auth/login - Login user (now handles form submission)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.render('index', { error: 'Invalid email or password' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('index', { error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Set the JWT as an HTTP-only cookie
    setTokenCookie(res, token);

    // Redirect to the dashboard on successful login
    res.redirect('/dashboard');

  } catch (err) {
    console.error(err);
    res.render('index', { error: 'Login failed' });
  }
});


// Add this route to your existing auth.routes.js

// GET /auth/logout - Logout user
router.get("/logout", (req, res) => {
  // Clear the token cookie
  res.clearCookie('token');
  // Redirect to the homepage
  res.redirect('/');
});

module.exports = router;