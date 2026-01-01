const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// POST /api/bookings - Book a ride (for riders)
router.post('/', authenticateToken, async (req, res) => {
  // Check if the user is a rider
  if (req.user.role !== 'rider') {
    return res.status(403).json({ error: 'Only riders can book rides' });
  }

  const { ride_id, seats_booked = 1 } = req.body;
  const rider_id = req.user.id;

  console.log("Booking request:", { ride_id, rider_id, seats_booked });

  // Basic validation
  if (!ride_id) {
    return res.status(400).json({ error: 'Ride ID is required' });
  }

  if (seats_booked < 1) {
    return res.status(400).json({ error: 'Must book at least 1 seat' });
  }

  let connection;
  try {
    // Get a connection from the pool to run a transaction
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Check if the ride exists and has enough seats
    const [rides] = await connection.execute(
      'SELECT * FROM rides WHERE id = ? AND seats_available >= ? FOR UPDATE',
      [ride_id, seats_booked]
    );

    if (rides.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Ride not found or not enough seats available' });
    }

    const ride = rides[0];

    // 2. Check if rider is already booked on this ride
    const [existingBookings] = await connection.execute(
      'SELECT * FROM bookings WHERE ride_id = ? AND rider_id = ?',
      [ride_id, rider_id]
    );

    if (existingBookings.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'You have already booked this ride' });
    }

    // 3. Create the booking
    const insertBookingQuery = `
      INSERT INTO bookings (ride_id, rider_id, seats_booked, status) 
      VALUES (?, ?, ?, 'confirmed')
    `;
    const [bookingResult] = await connection.execute(insertBookingQuery, [ride_id, rider_id, seats_booked]);

    // 4. Update the available seats in the ride
    const updateRideQuery = 'UPDATE rides SET seats_available = seats_available - ? WHERE id = ?';
    await connection.execute(updateRideQuery, [seats_booked, ride_id]);

    // 5. Commit the transaction if everything was successful
    await connection.commit();

    console.log("Booking successful. Booking ID:", bookingResult.insertId);
    
    res.status(201).json({
      success: true,
      message: 'Ride booked successfully!',
      bookingId: bookingResult.insertId,
      seatsBooked: seats_booked,
      seatsRemaining: ride.seats_available - seats_booked
    });

  } catch (err) {
    // If any error occurs, roll back the transaction
    if (connection) await connection.rollback();
    console.error('Error booking ride:', err);
    res.status(500).json({ error: 'Failed to book ride. Please try again.' });
  } finally {
    // Always release the connection back to the pool
    if (connection) connection.release();
  }
});

// GET /api/bookings - Get user's bookings
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = '';
    let queryParams = [req.user.id];
    
    if (req.user.role === 'rider') {
      query = `
        SELECT b.*, r.*, u.name as driver_name
        FROM bookings b
        JOIN rides r ON b.ride_id = r.id
        JOIN users u ON r.driver_id = u.id
        WHERE b.rider_id = ?
        ORDER BY b.created_at DESC
      `;
    } else if (req.user.role === 'driver') {
      query = `
        SELECT b.*, r.*, u.name as rider_name
        FROM bookings b
        JOIN rides r ON b.ride_id = r.id
        JOIN users u ON b.rider_id = u.id
        WHERE r.driver_id = ?
        ORDER BY b.created_at DESC
      `;
    }

    const [bookings] = await pool.execute(query, queryParams);
    res.json({ success: true, bookings });

  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});


// DELETE /api/bookings/:id - Delete/Cancel a booking (for riders)
router.delete('/:id', authenticateToken, async (req, res) => {
  const bookingId = req.params.id;
  const userId = req.user.id;

  console.log(`=== CANCELLATION ATTEMPT ===`);
  console.log('Booking ID from URL:', bookingId);
  console.log('Authenticated User ID:', userId);

  let connection;
  try {
    // First, check if the booking exists at all
    const [allBookings] = await pool.query(
      'SELECT * FROM bookings WHERE id = ?',
      [bookingId]
    );

    console.log('Booking exists in system:', allBookings.length > 0);
    if (allBookings.length > 0) {
      console.log('Booking details:', allBookings[0]);
      console.log('Booking belongs to user ID:', allBookings[0].rider_id);
      
      // Check if booking belongs to current user
      if (allBookings[0].rider_id !== userId) {
        console.log('❌ ACCESS DENIED: Booking belongs to different user');
        return res.status(403).json({ 
          success: false,
          error: 'Access denied. This booking belongs to another user.' 
        });
      }
    } else {
      console.log('❌ BOOKING NOT FOUND');
      return res.status(404).json({ 
        success: false,
        error: 'Booking not found' 
      });
    }

    // Now get full booking details with ride information
    const [userBookings] = await pool.query(
      `SELECT b.*, r.seats_available, r.driver_id, r.ride_time 
       FROM bookings b 
       JOIN rides r ON b.ride_id = r.id 
       WHERE b.id = ? AND b.rider_id = ?`,
      [bookingId, userId]
    );

    console.log('Bookings found for current user:', userBookings.length);

    if (userBookings.length === 0) {
      console.log('❌ Unexpected error: Booking exists but query returned empty');
      return res.status(404).json({ 
        success: false,
        error: 'Booking not found' 
      });
    }

    const booking = userBookings[0];

    // Check if the ride has already happened
    const rideTime = new Date(booking.ride_time);
    const currentTime = new Date();
    
    if (rideTime < currentTime) {
      console.log('❌ Cannot cancel past ride');
      return res.status(400).json({ 
        success: false,
        error: 'Cannot cancel booking for a ride that has already happened' 
      });
    }

    // Start transaction for data consistency
    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. Delete the booking
      const [deleteResult] = await connection.execute(
        'DELETE FROM bookings WHERE id = ?',
        [bookingId]
      );
      console.log('Booking deleted. Affected rows:', deleteResult.affectedRows);

      // 2. Restore the available seats in the ride
      const [updateResult] = await connection.execute(
        'UPDATE rides SET seats_available = seats_available + ? WHERE id = ?',
        [booking.seats_booked, booking.ride_id]
      );
      console.log('Seats restored. Affected rows:', updateResult.affectedRows);
      console.log('Seats restored:', booking.seats_booked);

      await connection.commit();
      console.log("✅ Booking cancelled successfully. ID:", bookingId);
      
      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        seatsRestored: booking.seats_booked,
        bookingId: bookingId
      });

    } catch (err) {
      await connection.rollback();
      console.error('Transaction error:', err);
      throw err;
    } finally {
      if (connection) connection.release();
    }

  } catch (err) {
    console.error('Error cancelling booking:', err);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to cancel booking';
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = 'Database integrity error. Please contact support.';
    } else if (err.code === 'ER_LOCK_DEADLOCK') {
      errorMessage = 'System busy. Please try again.';
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage 
    });
  }
});

module.exports = router;