// driver-tracking.js - SIMPLE WORKING VERSION
class DriverTracking {
    constructor() {
        this.isTracking = false;
        this.trackingInterval = null;
        this.currentRideId = null;
        
        console.log('🚗 DriverTracking initializing...');
        
        // Initialize socket
        this.socket = io();
        
        // Simple connection handling
        this.socket.on('connect', () => {
            console.log('✅ DRIVER SOCKET CONNECTED! ID:', this.socket.id);
        });

        this.socket.on('disconnect', () => {
            console.log('❌ DRIVER SOCKET DISCONNECTED');
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ DRIVER SOCKET ERROR:', error);
        });

        console.log('🚗 DriverTracking initialized');
    }

    startTracking(rideId) {
        console.log('🚗 START TRACKING called for ride:', rideId);
        
        // Check socket connection
        if (!this.socket.connected) {
            alert('❌ Not connected to server. Please wait a moment and try again.');
            console.log('❌ Socket not connected. Status:', this.socket.connected);
            return;
        }

        if (this.isTracking) {
            this.stopTracking();
        }

        this.isTracking = true;
        this.currentRideId = rideId;
        
        // Update button
        this.updateButton(rideId, 'sharing');
        
        // Start location updates
        this.updateLocation(rideId);
        this.trackingInterval = setInterval(() => {
            this.updateLocation(rideId);
        }, 5000);
        
        alert('📍 Location sharing started! Updates every 5 seconds.');
    }

    stopTracking() {
        console.log('🛑 Stopping location sharing');
        this.isTracking = false;
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
        }
        this.updateButton(this.currentRideId, 'stopped');
        this.currentRideId = null;
    }

    updateButton(rideId, status) {
        const button = document.querySelector(`[data-ride-id="${rideId}"]`);
        if (!button) return;
        
        if (status === 'sharing') {
            button.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Stop Sharing Location';
            button.classList.remove('btn-success');
            button.classList.add('btn-warning');
            button.onclick = () => this.stopTracking();
        } else {
            button.innerHTML = '<i class="bi bi-geo-alt"></i> Start Sharing Location';
            button.classList.remove('btn-warning');
            button.classList.add('btn-success');
            button.onclick = () => this.startTracking(rideId);
        }
    }

    updateLocation(rideId) {
        if (!navigator.geolocation) {
            alert('❌ Geolocation is not supported by your browser');
            return;
        }

        console.log('📍 Getting current location...');
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                const driverId = document.body.getAttribute('data-user-id') || 
                                document.getElementById('current-user-id')?.value;
                
                console.log('📍 Location obtained:', { latitude, longitude });
                
                // Send to server
                this.socket.emit('driver-location-update', {
                    rideId: rideId,
                    driverId: driverId,
                    latitude: latitude,
                    longitude: longitude
                });
                
                console.log('📍 Location sent to server');
            },
            (error) => {
                console.error('❌ Location error:', error);
                let message = 'Unable to get location: ';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        message += 'Please allow location access.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message += 'Location unavailable.';
                        break;
                    case error.TIMEOUT:
                        message += 'Location request timed out.';
                        break;
                    default:
                        message += 'Unknown error.';
                        break;
                }
                
                alert(message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }
}

// Initialize driver tracking
const driverTracking = new DriverTracking();