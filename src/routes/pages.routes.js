const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// GET / - Homepage (Login/Register Page)
router.get('/', (req, res) => {
  res.render('index');
});

// GET /dashboard - Main Dashboard (Protected)
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { search, start_location, end_location, date,success, error } = req.query;

    let ridesData = [];
    if (user.role === 'rider') {
      let query = `
        SELECT r.*, 
        u.name as driver_name,
        u.id as driver_id,
        u.avg_rating,
        r.description,
        (SELECT COUNT(*) FROM ratings WHERE driver_id = u.id) as total_ratings
        FROM rides r 
        JOIN users u ON r.driver_id = u.id 
        WHERE r.seats_available > 0 AND r.ride_time > NOW()
      `;
      let queryParams = [];

      // Add search filters
      if (search) {
        query += ` AND (r.start_location LIKE ? OR r.end_location LIKE ? OR u.name LIKE ?)`;
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (start_location) {
        query += ` AND r.start_location LIKE ?`;
        queryParams.push(`%${start_location}%`);
      }

      if (end_location) {
        query += ` AND r.end_location LIKE ?`;
        queryParams.push(`%${end_location}%`);
      }

      if (date) {
        query += ` AND DATE(r.ride_time) = ?`;
        queryParams.push(date);
      }

      query += ` ORDER BY r.ride_time ASC`;

      console.log("Executing query:", query, queryParams);
      const [rides] = await pool.query(query, queryParams);
      ridesData = rides;
      
    // NEW: For each ride, check if the current user has booked it
      for (let ride of rides) {
        const [userBookings] = await pool.query(
          'SELECT id, status FROM bookings WHERE ride_id = ? AND rider_id = ?',
          [ride.id, user.id]
        );
        
        // Add booking info to the ride object
        ride.user_has_booking = userBookings.length > 0;
        ride.user_booking_id = userBookings.length > 0 ? userBookings[0].id : null;
        ride.user_booking_status = userBookings.length > 0 ? userBookings[0].status : null;
      }

    } else if (user.role === 'driver') {
  const [rides] = await pool.query(`
    SELECT 
      r.*,
      u.avg_rating,
      r.description,
      (SELECT COUNT(*) FROM ratings WHERE driver_id = u.id) as total_ratings
    FROM rides r
    JOIN users u ON r.driver_id = u.id
    WHERE r.driver_id = ?
    ORDER BY r.ride_time ASC
  `, [user.id]);
  ridesData = rides;
}

    // Ensure filters object is always defined with default values
    const filters = {
      search: search || '',
      start_location: start_location || '',
      end_location: end_location || '',
      date: date || ''
    };

    res.render('dashboard', { 
      user: user, 
      rides: ridesData,
      filters: filters, // Pass filters with default values
      success: success, // Pass success message
      error: error      // Pass error message
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('error', { error: 'Failed to load dashboard' });
  }
});



// GET /my-bookings - My Bookings page (for riders)
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'rider') {
      return res.redirect('/dashboard');
    }

    // FIXED: Use aliases to avoid column name conflicts
    const [bookings] = await pool.query(`
      SELECT 
        b.id as booking_id,
        b.ride_id,
        b.rider_id, 
        b.seats_booked,
        b.status as booking_status,
        b.created_at as booking_created,
        r.*,
        u.name as driver_name, 
        u.email as driver_email
      FROM bookings b
      JOIN rides r ON b.ride_id = r.id
      JOIN users u ON r.driver_id = u.id
      WHERE b.rider_id = ?
      ORDER BY b.created_at DESC
    `, [req.user.id]);

    res.render('my-bookings', {
      user: req.user,
      bookings: bookings,
      page: 'bookings'
    });

  } catch (err) {
    console.error('My Bookings error:', err);
    res.status(500).render('error', { error: 'Failed to load your bookings' });
  }
});

// GET /my-rides - My Rides page (for drivers)
router.get('/my-rides', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.redirect('/dashboard');
    }

    // Get all rides offered by the current driver
    const [rides] = await pool.query(`
      SELECT 
        r.*, 
        COUNT(b.id) as total_bookings,
        u.avg_rating,
        (SELECT COUNT(*) FROM ratings WHERE driver_id = u.id) as total_ratings
      FROM rides r
      LEFT JOIN bookings b ON r.id = b.ride_id
      JOIN users u ON r.driver_id = u.id  
      WHERE r.driver_id = ?
      GROUP BY r.id
      ORDER BY r.ride_time DESC
    `, [req.user.id]);

    res.render('my-rides', {
      user: req.user,
      rides: rides,
      page: 'rides'
    });

  } catch (err) {
    console.error('My Rides error:', err);
    res.status(500).render('error', { error: 'Failed to load your rides' });
  }
});

// GET /ride/:id/bookings - View bookings for a specific ride (for drivers)
router.get('/ride/:id/bookings', authenticateToken, async (req, res) => {
  try {
    const rideId = req.params.id;

    // Verify the ride belongs to the current driver
    const [rides] = await pool.query(
      'SELECT * FROM rides WHERE id = ? AND driver_id = ?',
      [rideId, req.user.id]
    );

    if (rides.length === 0) {
      return res.status(404).render('error', { error: 'Ride not found or access denied' });
    }

    // Get all bookings for this ride with rider details
    const [bookings] = await pool.query(`
      SELECT b.*, u.name as rider_name, u.email as rider_email
      FROM bookings b
      JOIN users u ON b.rider_id = u.id
      WHERE b.ride_id = ?
      ORDER BY b.created_at DESC
    `, [rideId]);

    res.render('ride-bookings', {
      user: req.user,
      ride: rides[0],
      bookings: bookings,
      page: 'rides'
    });

  } catch (err) {
    console.error('Ride bookings error:', err);
    res.status(500).render('error', { error: 'Failed to load ride bookings' });
  }
});






// GET /ratings/:driver_id - View ratings for a driver
router.get('/ratings/:driver_id', async (req, res) => {
  try {
    const driver_id = req.params.driver_id;

    // Get driver info
    const [drivers] = await pool.query('SELECT name FROM users WHERE id = ?', [driver_id]);
    if (drivers.length === 0) {
      return res.status(404).render('error', { error: 'Driver not found' });
    }

    // Get ratings for this driver
    const [ratings] = await pool.query(`
      SELECT r.*, u.name as rider_name, u.email as rider_email
      FROM ratings r
      JOIN users u ON r.rider_id = u.id
      WHERE r.driver_id = ?
      ORDER BY r.created_at DESC
    `, [driver_id]);

    // Calculate average rating
    const [avgResult] = await pool.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM ratings WHERE driver_id = ?',
      [driver_id]
    );

    // Convert string to number
    const averageRating = avgResult[0].avg_rating ? parseFloat(avgResult[0].avg_rating) : 0;
    const totalRatings = avgResult[0].total || 0;

    res.render('ratings', {
      driverName: drivers[0].name,
      ratings: ratings,
      averageRating: averageRating,  // Now a number, not string
      totalRatings: totalRatings
    });

  } catch (err) {
    console.error('Ratings page error:', err);
    res.status(500).render('error', { error: 'Failed to load ratings' });
  }
});





module.exports = router;