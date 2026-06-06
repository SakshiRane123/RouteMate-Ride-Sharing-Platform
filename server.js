const express=require("express");
const http = require('http');
const socketIo = require('socket.io');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


const app=express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:8080", // or your actual domain
    methods: ["GET", "POST"],
    credentials: true
  }
});


const cookieParser = require('cookie-parser');
const pool = require("./src/db"); // import db connection
require("dotenv").config();
// let port=8080;
const path=require("path");

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname,"public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());







// Import middleware
const authenticateToken = require('./src/middleware/auth'); 


// ADD THIS LINE - it won't affect existing routes
app.use('/', require('./src/routes/profile.routes'));

const ratingsRoutes = require('./src/routes/ratings.routes');
app.use("/api/ratings", authenticateToken, ratingsRoutes);

// Import auth routes
const authRoutes = require("./src/routes/auth.routes");
app.use("/auth", authRoutes);

const pageRoutes = require("./src/routes/pages.routes");
app.use("/", pageRoutes);

const ridesRoutes = require('./src/routes/rides.routes');
app.use("/api/rides", authenticateToken, ridesRoutes);

const bookingsRoutes = require('./src/routes/bookings.routes');
app.use("/api/bookings", authenticateToken, bookingsRoutes);

// Add with other routes
const chatRoutes = require('./src/routes/chat.routes');
app.use('/api/chat', chatRoutes);



// test route
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ success: true, result: rows[0].result });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ success: false, error: "DB connection failed" });
  }
});





// Predict fare using Python AI API
app.post("/api/predict-fare", async (req, res) => {
  try {
    const { distance, duration, traffic, seats } = req.body;

    const response = await fetch("http://127.0.0.1:5001/predict-fare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ distance, duration, traffic, seats }),
    });

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error("Error connecting to AI API:", error);
    res.status(500).json({ error: "Failed to get prediction" });
  }
});

// (Keep your other existing routes here)









// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);
    console.log('✅ Total connected clients:', io.engine.clientsCount);

    // ★★★ CHAT EVENTS ★★★
    socket.on('join-ride', (rideId) => {
        socket.join(`ride-${rideId}`);
        console.log(`💬 User ${socket.id} joined chat room: ride-${rideId}`);
    });

    socket.on('chat-message', async (data) => {
        console.log('📩 Received chat message:', data);
        
        try {
            const [result] = await pool.query(
                'INSERT INTO ride_chats (ride_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)',
                [data.rideId, data.senderId, data.receiverId, data.message]
            );

            const messageData = {
                id: result.insertId,
                ride_id: data.rideId,
                sender_id: data.senderId,
                receiver_id: data.receiverId,
                message: data.message,
                created_at: new Date()
            };

            socket.to(`ride-${data.rideId}`).emit('new-message', messageData);
            socket.emit('message-sent', { ...messageData, status: 'delivered' });

            console.log('📤 Message broadcasted to room:', `ride-${data.rideId}`);

        } catch (error) {
            console.error('❌ Chat message error:', error);
            socket.emit('message-error', { error: 'Failed to send message' });
        }
    });

    // ★★★ TRACKING EVENTS - FIXED VERSION ★★★
    socket.on('join-ride-tracking', async (rideId) => {
        socket.join(`tracking-${rideId}`);
        const roomSize = io.sockets.adapter.rooms.get(`tracking-${rideId}`)?.size || 0;
        
        console.log(`📍 User ${socket.id} joined tracking room: tracking-${rideId}`);
        console.log(`📍 Room tracking-${rideId} now has ${roomSize} users`);
        
        // Send immediate confirmation to rider
        socket.emit('tracking-joined', { 
            rideId: rideId, 
            message: 'Successfully joined tracking room',
            roomSize: roomSize,
            timestamp: new Date()
        });

        // ★★★ FIXED: Send last known location immediately ★★★
        try {
            // Get the most recent location for this ride
            const [rows] = await pool.query(
                `SELECT latitude, longitude, created_at 
                 FROM ride_tracking 
                 WHERE ride_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 1`,
                [rideId]
            );

            if (rows.length > 0) {
                const lastLocation = rows[0];
                socket.emit('driver-location-updated', {
                    rideId: rideId,
                    latitude: lastLocation.latitude,
                    longitude: lastLocation.longitude,
                    timestamp: lastLocation.created_at,
                    fromCache: true
                });
                console.log(`📍 Sent last known location to new rider for ride ${rideId}`);
            } else {
                console.log(`📍 No previous location found for ride ${rideId}`);
            }
        } catch (error) {
            console.error('❌ Error sending last location:', error);
        }
    });

    socket.on('driver-location-update', async (data) => {
        try {
            const { rideId, driverId, latitude, longitude } = data;
            
            console.log('🚗 DRIVER LOCATION UPDATE:', {
                rideId, driverId, latitude, longitude
            });

            // Save to database
            await pool.query(
                `INSERT INTO ride_tracking (ride_id, driver_id, latitude, longitude) 
                 VALUES (?, ?, ?, ?)`,
                [rideId, driverId, latitude, longitude]
            );

            console.log('💾 Location saved to database');

            // ★★★ BROADCAST TO ALL RIDERS IN ROOM ★★★
            const room = `tracking-${rideId}`;
            const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
            
            if (roomSize > 0) {
                io.to(room).emit('driver-location-updated', {
                    rideId: rideId,
                    driverId: driverId,
                    latitude: latitude,
                    longitude: longitude,
                    timestamp: new Date(),
                    broadcast: true
                });
                console.log(`📍 BROADCAST SUCCESS: Sent to ${roomSize} users in ${room}`);
            } else {
                console.log(`📍 NO RIDERS: Location saved but no riders in ${room}`);
            }

        } catch (error) {
            console.error('❌ Location update error:', error);
        }
    });

    socket.on('request-location', (rideId) => {
        console.log(`📍 User ${socket.id} requested location for ride ${rideId}`);
        socket.emit('location-requested', { rideId, timestamp: new Date() });
    });

    socket.on('disconnect', (reason) => {
        console.log('❌ User disconnected:', socket.id, 'Reason:', reason);
    });

}).on('error', (error) => {
    console.error('❌ Socket.io server error:', error);
});





// ✅ Use server.listen instead of app.listen
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});