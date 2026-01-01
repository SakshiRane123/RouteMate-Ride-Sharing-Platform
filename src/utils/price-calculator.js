// Simple AI-like price calculator
class PriceCalculator {
    constructor() {
        this.baseRatePerKm = 3; // ₹3 per km base rate
    }

    // ★★★ CALCULATE SUGGESTED PRICE RANGE ★★★
    calculatePriceRange(ride) {
        if (!ride || ride.seats_available <= 0) {
            return null; // Don't show price if no seats available
        }

        // Estimate distance based on route (you can improve this later)
        const estimatedDistance = this.estimateDistance(ride.start_location, ride.end_location);
        
        // Calculate base price
        const basePrice = estimatedDistance * this.baseRatePerKm;
        
        // Apply adjustments based on factors
        const adjustments = this.calculateAdjustments(ride);
        const finalPrice = basePrice + adjustments;
        
        // Create a reasonable price range (±15%)
        const minPrice = Math.round(finalPrice * 0.85);
        const maxPrice = Math.round(finalPrice * 1.15);
        
        return {
            min: minPrice,
            max: maxPrice,
            base: Math.round(basePrice),
            adjustments: Math.round(adjustments),
            confidence: this.calculateConfidence(ride)
        };
    }

    // ★★★ ESTIMATE DISTANCE BETWEEN LOCATIONS ★★★
    estimateDistance(start, end) {
        // Simple distance estimation based on common routes
        const commonRoutes = {
            'Mumbai-Pune': 180,
            'Delhi-Mumbai': 1400,
            'Bangalore-Chennai': 350,
            'Andheri-Dadar': 25,
            'Default': 50 // Average city ride
        };

        const routeKey = `${start}-${end}`.toLowerCase();
        
        for (const [route, distance] of Object.entries(commonRoutes)) {
            if (routeKey.includes(route.toLowerCase())) {
                return distance;
            }
        }
        
        return commonRoutes.Default;
    }

    // ★★★ CALCULATE PRICE ADJUSTMENTS ★★★
    calculateAdjustments(ride) {
        let adjustments = 0;
        
        // Time-based adjustments
        adjustments += this.getTimeAdjustment(ride.ride_time);
        
        // Driver rating adjustments
        adjustments += this.getRatingAdjustment(ride.avg_rating);
        
        // Demand-based adjustments (seats available)
        adjustments += this.getDemandAdjustment(ride.seats_available);
        
        return adjustments;
    }

    // ★★★ TIME-BASED ADJUSTMENTS ★★★
    getTimeAdjustment(rideTime) {
        const hour = new Date(rideTime).getHours();
        
        // Rush hour pricing
        if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
            return 50; // Rush hour premium
        }
        
        // Late night/early morning premium
        if (hour >= 22 || hour <= 5) {
            return 30; // Night premium
        }
        
        return 0; // Normal hours
    }

    // ★★★ RATING-BASED ADJUSTMENTS ★★★
    getRatingAdjustment(rating) {
        if (!rating) return 0;
        
        if (rating >= 4.5) return 40; // Premium for highly rated drivers
        if (rating >= 4.0) return 20; // Good driver premium
        if (rating <= 3.0) return -20; // Discount for lower rated drivers
        
        return 0;
    }

    // ★★★ DEMAND-BASED ADJUSTMENTS ★★★
    getDemandAdjustment(seatsAvailable) {
        if (seatsAvailable === 1) return 30; // Last seat premium
        if (seatsAvailable >= 4) return -10; // Discount for plenty of seats
        
        return 0;
    }

    // ★★★ CALCULATE CONFIDENCE SCORE ★★★
    calculateConfidence(ride) {
        let confidence = 70; // Base confidence
        
        if (ride.avg_rating && ride.avg_rating > 0) confidence += 10;
        if (ride.total_ratings && ride.total_ratings > 5) confidence += 10;
        if (ride.pickup_instructions) confidence += 5;
        
        return Math.min(confidence, 95);
    }
}

module.exports = new PriceCalculator();