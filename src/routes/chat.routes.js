const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get chat messages for a specific ride
router.get('/ride/:rideId', async (req, res) => {
    try {
        const [messages] = await pool.query(`
            SELECT rc.*, u.name as sender_name 
            FROM ride_chats rc 
            JOIN users u ON rc.sender_id = u.id 
            WHERE rc.ride_id = ? 
            ORDER BY rc.created_at ASC
        `, [req.params.rideId]);

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Chat history error:', error);
        res.status(500).json({ success: false, error: 'Failed to load messages' });
    }
});

// Mark messages as read
router.post('/mark-read', async (req, res) => {
    try {
        const { messageIds } = req.body;
        await pool.query(
            'UPDATE ride_chats SET is_read = TRUE WHERE id IN (?)',
            [messageIds]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ success: false, error: 'Failed to mark messages as read' });
    }
});

module.exports = router;