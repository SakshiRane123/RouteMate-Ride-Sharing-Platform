const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth'); // Import the middleware


// GET /api/rides - Get all available rides (for riders to browse)
router.get('/', authenticateToken, async (req, res) => {
  // This endpoint is for riders. We could add checks later if needed.
  try {
    // Query to get all rides with available seats, including driver's name
    const query = `
      SELECT r.*, u.name as driver_name 
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      WHERE r.seats_available > 0 AND r.ride_time > NOW()
      ORDER BY r.ride_time ASC
    `;
    const [rides] = await pool.query(query);
    res.json(rides);
  } catch (err) {
    console.error('Error fetching rides:', err);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});



// POST /api/rides - Create a new ride (for drivers)
router.post('/', authenticateToken, async (req, res) => {
  // Check if the user is a driver
  if (req.user.role !== 'driver') {
    return res.redirect('/dashboard?error=Only drivers can create rides');
  }

  // ★★★ ADD AI PREDICTION FIELDS ★★★
  const { 
    start_location, 
    end_location, 
    ride_time, 
    seats_available, 
    pickup_instructions,
    distance_km,      // NEW
    duration_min,     // NEW
    traffic_level     // NEW
  } = req.body;

  // Enhanced validation with new fields
  if (!start_location || !end_location || !ride_time || !seats_available || 
      !distance_km || !duration_min || !traffic_level) {
    return res.redirect('/dashboard?error=Missing required fields');
  }

  try {
    // GENERATE AI DESCRIPTION
    let aiDescription = '';
    try {
      aiDescription = await generateRideDescription(
        start_location, 
        end_location, 
        ride_time, 
        seats_available
      );
      console.log("AI Description generated:", aiDescription);
    } catch (aiError) {
      console.error("AI failed, using fallback:", aiError);
      aiDescription = `Ride from ${start_location} to ${end_location}`;
    }

    // ★★★ UPDATED QUERY WITH AI PREDICTION FIELDS ★★★
    const query = `
      INSERT INTO rides (
        driver_id, 
        start_location, 
        end_location, 
        ride_time, 
        seats_available, 
        pickup_instructions,
        description,
        distance_km,      -- NEW
        duration_min,     -- NEW
        traffic_level     -- NEW
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.query(query, [
      req.user.id, 
      start_location, 
      end_location, 
      ride_time, 
      seats_available,
      pickup_instructions || null,
      aiDescription,
      distance_km,    // NEW
      duration_min,   // NEW
      traffic_level   // NEW
    ]);

    console.log("Ride created successfully with ID:", result.insertId);
    
    // REDIRECT instead of sending JSON
    res.redirect('/dashboard?success=Ride created successfully');

  } catch (err) {
    console.error('Error creating ride:', err);
    res.redirect('/dashboard?error=Failed to create ride');
  }
});


// GET /api/rides/:id - Get details of a specific ride
router.get('/:id', authenticateToken, async (req, res) => {
  const rideId = req.params.id;
  try {
    const query = `
      SELECT r.*, u.name as driver_name , r.description
      FROM rides r
      JOIN users u ON r.driver_id = u.id
      WHERE r.id = ?
    `;
    const [rides] = await pool.query(query, [rideId]);
    if (rides.length === 0) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    res.json(rides[0]);
  } catch (err) {
    console.error('Error fetching ride:', err);
    res.status(500).json({ error: 'Failed to fetch ride' });
  }
});


// DELETE /api/rides/:id - Delete a ride (for drivers)
router.delete('/:id', authenticateToken, async (req, res) => {
  // Check if the user is a driver
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Only drivers can delete rides' });
  }

  const rideId = req.params.id;

  try {
    // First, check if the ride belongs to the current driver
    const [rides] = await pool.query(
      'SELECT * FROM rides WHERE id = ? AND driver_id = ?',
      [rideId, req.user.id]
    );

    if (rides.length === 0) {
      return res.status(404).json({ error: 'Ride not found or access denied' });
    }

    const ride = rides[0];

    // Check if there are any bookings for this ride
    const [bookings] = await pool.query(
      'SELECT * FROM bookings WHERE ride_id = ?',
      [rideId]
    );

    if (bookings.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete ride with active bookings. Cancel bookings first.' 
      });
    }

    // Delete the ride
    await pool.query('DELETE FROM rides WHERE id = ?', [rideId]);

    console.log("Ride deleted successfully. ID:", rideId);
    
    res.json({
      success: true,
      message: 'Ride deleted successfully'
    });

  } catch (err) {
    console.error('Error deleting ride:', err);
    res.status(500).json({ error: 'Failed to delete ride' });
  }
});

module.exports = router;