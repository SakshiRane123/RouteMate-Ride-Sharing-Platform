// routes/profile.routes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /profile - Show profile page
router.get('/profile', async (req, res) => {
    console.log('🔍 Profile route accessed');
    console.log('Session data:', req.session);
    
    try {
        // Check if user is logged in
        if (!req.session.user) {
            console.log('❌ No user in session - redirecting to login');
            return res.redirect('/login');
        }

        console.log('✅ User found in session:', req.session.user);

        // Get user data from database
        const [userRows] = await pool.query(
            'SELECT id, name, email, role FROM users WHERE id = ?',
            [req.session.user.id]
        );
        
        console.log('📊 Database result:', userRows);

        if (userRows.length === 0) {
            console.log('❌ User not found in database - redirecting to logout');
            return res.redirect('/logout');
        }

        console.log('✅ User data retrieved successfully');
        
        // Render profile page with user data
        res.render('profile', { 
            user: userRows[0]
        });

    } catch (error) {
        console.error('❌ Profile error:', error);
        res.render('error', { error: 'Failed to load profile' });
    }
});

module.exports = router;