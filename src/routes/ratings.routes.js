const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// POST /api/ratings - Submit a rating and review
router.post('/', authenticateToken, async (req, res) => {
  const { ride_id, rating, review } = req.body;
  const rider_id = req.user.id;

  console.log('Rating submission:', { ride_id, rating, rider_id });

  // Validation
  if (!ride_id || !rating) {
    return res.status(400).json({ error: 'Ride ID and rating are required' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    // Check if the rider actually took this ride
    const [bookings] = await pool.query(
      `SELECT b.*, r.driver_id 
       FROM bookings b 
       JOIN rides r ON b.ride_id = r.id 
       WHERE b.ride_id = ? AND b.rider_id = ? AND b.status = 'confirmed'`,
      [ride_id, rider_id]
    );

    if (bookings.length === 0) {
      return res.status(400).json({ error: 'You can only rate rides you have completed' });
    }

    const driver_id = bookings[0].driver_id;

    // Check if already rated
    const [existingRatings] = await pool.query(
      'SELECT * FROM ratings WHERE ride_id = ? AND rider_id = ?',
      [ride_id, rider_id]
    );

    let result;
    if (existingRatings.length > 0) {
      // Update existing rating
      [result] = await pool.query(
        'UPDATE ratings SET rating = ?, review = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [rating, review, existingRatings[0].id]
      );
      console.log('Updated existing rating');
    } else {
      // Create new rating
      [result] = await pool.query(
        'INSERT INTO ratings (ride_id, driver_id, rider_id, rating, review) VALUES (?, ?, ?, ?, ?)',
        [ride_id, driver_id, rider_id, rating, review]
      );
      console.log('Created new rating');
    }

    // Update driver's average rating
    await updateDriverRating(driver_id);

    res.json({
      success: true,
      message: existingRatings.length > 0 ? 'Rating updated successfully' : 'Rating submitted successfully',
      ratingId: existingRatings.length > 0 ? existingRatings[0].id : result.insertId
    });

  } catch (err) {
    console.error('Rating submission error:', err);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// GET /api/ratings/driver/:driver_id - Get ratings for a driver
router.get('/driver/:driver_id', async (req, res) => {
  const driver_id = req.params.driver_id;

  try {
    const [ratings] = await pool.query(`
      SELECT r.*, u.name as rider_name, u.email as rider_email
      FROM ratings r
      JOIN users u ON r.rider_id = u.id
      WHERE r.driver_id = ?
      ORDER BY r.created_at DESC
    `, [driver_id]);

    // Calculate average rating
    const [avgResult] = await pool.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings FROM ratings WHERE driver_id = ?',
      [driver_id]
    );

    res.json({
      success: true,
      ratings: ratings,
      averageRating: avgResult[0].avg_rating || 0,
      totalRatings: avgResult[0].total_ratings || 0
    });

  } catch (err) {
    console.error('Get ratings error:', err);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// GET /api/ratings/ride/:ride_id - Get ratings for a specific ride
router.get('/ride/:ride_id', async (req, res) => {
  const ride_id = req.params.ride_id;

  try {
    const [ratings] = await pool.query(`
      SELECT r.*, u.name as rider_name, u.email as rider_email
      FROM ratings r
      JOIN users u ON r.rider_id = u.id
      WHERE r.ride_id = ?
      ORDER BY r.created_at DESC
    `, [ride_id]);

    res.json({
      success: true,
      ratings: ratings
    });

  } catch (err) {
    console.error('Get ride ratings error:', err);
    res.status(500).json({ error: 'Failed to fetch ride ratings' });
  }
});

// Helper function to update driver's average rating
// Helper function to update driver's average rating
async function updateDriverRating(driver_id) {
  try {
    console.log(`Updating rating for driver: ${driver_id}`);
    
    const [result] = await pool.query(
      'SELECT COALESCE(AVG(rating), 0) as avg_rating FROM ratings WHERE driver_id = ?',
      [driver_id]
    );

    const avg_rating = parseFloat(result[0].avg_rating);
    console.log(`Calculated average rating: ${avg_rating}`);

    const [updateResult] = await pool.query(
      'UPDATE users SET avg_rating = ? WHERE id = ?',
      [avg_rating, driver_id]
    );

    console.log(`Updated driver ${driver_id} rating to: ${avg_rating.toFixed(2)}`);
    console.log(`Rows affected: ${updateResult.affectedRows}`);

  } catch (err) {
    console.error('Error updating driver rating:', err);
  }
}

module.exports = router;