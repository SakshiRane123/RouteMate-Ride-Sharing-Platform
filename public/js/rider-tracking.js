// rider-tracking.js - ULTRA SIMPLE WORKING VERSION
class RiderTracking {
    constructor() {
        this.currentTrackedRide = null;
        this.socket = io();
        
        console.log('👀 RiderTracking initialized');
        
        // Simple event listeners
        this.socket.on('connect', () => {
            console.log('✅ Rider connected:', this.socket.id);
        });
        
        this.socket.on('driver-location-updated', (data) => {
            console.log('📍 RECEIVED LOCATION:', data);
            this.showLocation(data.latitude, data.longitude);
        });
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('track-ride-btn')) {
                const rideId = e.target.getAttribute('data-ride-id');
                const driverName = e.target.getAttribute('data-driver-name');
                this.startTracking(rideId, driverName);
            }
        });
    }
    
    startTracking(rideId, driverName) {
        console.log('🎯 Starting tracking for ride:', rideId);
        this.currentTrackedRide = rideId;
        
        this.socket.emit('join-ride-tracking', rideId);
        this.showModal(rideId, driverName);
    }
    
    showModal(rideId, driverName) {
        // Create simple modal
        const modalHTML = `
            <div class="modal fade" id="trackingModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">Tracking ${driverName}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <div id="tracking-status">Waiting for location...</div>
                            <div id="coordinates" class="mt-3"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal
        const oldModal = document.getElementById('trackingModal');
        if (oldModal) oldModal.remove();
        
        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('trackingModal'));
        modal.show();
    }
    
    showLocation(lat, lng) {
    console.log('📍 showLocation called with:', lat, lng);
    console.log('📍 Lat type:', typeof lat, 'Lng type:', typeof lng);
    
    // ★★★ FIX: Convert to numbers first ★★★
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    console.log('📍 Converted to numbers:', latNum, lngNum);
    
    const statusEl = document.getElementById('tracking-status');
    const coordsEl = document.getElementById('coordinates');
    
    if (statusEl) {
        statusEl.innerHTML = `<h4 class="text-success">📍 Live Location Active!</h4>`;
    }
    
    if (coordsEl) {
        coordsEl.innerHTML = `
            <div class="alert alert-success">
                <h5>📍 Driver's Current Location</h5>
                <p class="mb-1"><strong>Latitude:</strong> ${latNum.toFixed(6)}</p>
                <p class="mb-1"><strong>Longitude:</strong> ${lngNum.toFixed(6)}</p>
                <a href="https://maps.google.com/?q=${latNum},${lngNum}" target="_blank" class="btn btn-success btn-sm mt-2">
                    <i class="bi bi-map"></i> Open in Google Maps
                </a>
            </div>
        `;
        console.log('✅ Coordinates displayed successfully!');
    }
}
}

// Initialize
const riderTracking = new RiderTracking();