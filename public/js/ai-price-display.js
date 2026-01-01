// ai-price-display.js - Complete Version
class AIPriceDisplay {
    constructor() {
        this.apiUrl = 'http://localhost:5001/predict-fare';
        this.initialized = false;
    }

    // Initialize fare predictions for all rides on page load
    async initializeFarePredictions() {
        if (this.initialized) return;
        
        console.log('🚀 Initializing AI fare predictions...');
        
        const rideCards = document.querySelectorAll('.card[data-ride-id]');
        console.log(`Found ${rideCards.length} rides to predict fares for`);
        
        const predictionPromises = Array.from(rideCards).map(card => {
            const rideId = card.getAttribute('data-ride-id');
            return this.predictAndDisplayFare(rideId);
        });
        
        // Wait for all predictions to complete
        await Promise.allSettled(predictionPromises);
        
        this.initialized = true;
        console.log('✅ All fare predictions completed');
    }

    // Predict and display fare for a specific ride
    async predictAndDisplayFare(rideId) {
        try {
            // Get ride data from data attributes
            const rideElement = document.querySelector(`[data-ride-id="${rideId}"]`);
            if (!rideElement) {
                console.warn(`Ride element not found for ID: ${rideId}`);
                return;
            }

            const rideData = {
                distance: parseFloat(rideElement.getAttribute('data-distance')),
                duration: parseInt(rideElement.getAttribute('data-duration')),
                traffic: parseInt(rideElement.getAttribute('data-traffic')),
                seats: parseInt(rideElement.getAttribute('data-seats'))
            };

            console.log(`📊 Predicting fare for ride ${rideId}:`, rideData);

            // Call AI prediction API
            const predictedFare = await this.callAIPrediction(rideData);
            
            // Update the display
            this.updateFareDisplay(rideId, predictedFare, rideData);
            
        } catch (error) {
            console.error(`❌ Failed to predict fare for ride ${rideId}:`, error);
            this.showFallbackFare(rideId);
        }
    }

    // Call the AI prediction API
    async callAIPrediction(rideData) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(rideData)
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        return data.predicted_fare;
    }

    // Update the fare display in the UI
    updateFareDisplay(rideId, fare, rideData) {
        const fareElement = document.getElementById(`predicted-fare-${rideId}`);
        
        if (fareElement) {
            fareElement.innerHTML = `₹${fare}`;
            fareElement.classList.add('text-success', 'fw-bold');
            
            // Remove loading state
            const loadingElement = fareElement.closest('.ai-fare-prediction');
            if (loadingElement) {
                loadingElement.classList.remove('loading');
            }
            
            console.log(`✅ Fare predicted for ride ${rideId}: ₹${fare}`);
        }
    }

    // Fallback if AI prediction fails
    showFallbackFare(rideId) {
        const fareElement = document.getElementById(`predicted-fare-${rideId}`);
        const rideElement = document.querySelector(`[data-ride-id="${rideId}"]`);
        
        if (fareElement && rideElement) {
            const distance = parseFloat(rideElement.getAttribute('data-distance'));
            const seats = parseInt(rideElement.getAttribute('data-seats'));
            
            // Basic fare calculation as fallback
            const baseFare = distance * 8 + seats * 20;
            const minFare = Math.round(baseFare * 0.8);
            const maxFare = Math.round(baseFare * 1.2);
            
            fareElement.innerHTML = `₹${minFare}-₹${maxFare}`;
            fareElement.classList.add('text-warning');
            
            console.log(`🔄 Using fallback fare for ride ${rideId}: ₹${minFare}-₹${maxFare}`);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    const aiPriceDisplay = new AIPriceDisplay();
    aiPriceDisplay.initializeFarePredictions();
});