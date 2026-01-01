// Handle rating functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeRatingStars();
    setupRatingForm();
});

// Initialize star rating interaction
function initializeRatingStars() {
    const stars = document.querySelectorAll('.rating-star');
    let currentRating = 0;
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            currentRating = rating;
            document.getElementById('ratingValue').value = rating;
            updateStarsDisplay(rating);
        });
        
        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            updateStarsDisplay(rating);
        });
        
        star.addEventListener('mouseleave', () => {
            updateStarsDisplay(currentRating);
        });
    });
}

// Update stars display based on rating
function updateStarsDisplay(rating) {
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach(star => {
        const starRating = parseInt(star.getAttribute('data-rating'));
        if (starRating <= rating) {
            star.classList.remove('bi-star');
            star.classList.add('bi-star-fill');
            star.style.color = '#ffc107';
        } else {
            star.classList.remove('bi-star-fill');
            star.classList.add('bi-star');
            star.style.color = '#ddd';
        }
    });
}

// Setup rating form submission
function setupRatingForm() {
    const ratingForm = document.getElementById('ratingForm');
    if (ratingForm) {
        ratingForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const ratingValue = parseInt(formData.get('rating'));
            
            if (!ratingValue) {
                alert('Please select a rating');
                return;
            }
            
            // Show loading state
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Submitting...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/api/ratings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ride_id: parseInt(formData.get('ride_id')),
                        rating: ratingValue,
                        review: formData.get('review')
                    })
                });

                const result = await response.json();

                if (result.success) {
                    alert('Thank you for your rating!');
                    
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('ratingModal'));
                    if (modal) modal.hide();
                    
                    // Reload to show updated ratings
                    setTimeout(() => location.reload(), 1000);
                    
                } else {
                    alert(`Error: ${result.error}`);
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }

            } catch (error) {
                console.error('Rating submission error:', error);
                alert('Failed to submit rating. Please try again.');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

// Function to open rating modal
function openRatingModal(rideId) {
    console.log('Opening rating modal for ride:', rideId);
    
    // Reset form
    document.getElementById('ratingRideId').value = rideId;
    document.getElementById('ratingValue').value = '';
    document.getElementById('reviewText').value = '';
    
    // Reset stars
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach(star => {
        star.classList.remove('bi-star-fill');
        star.classList.add('bi-star');
        star.style.color = '#ddd';
    });
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('ratingModal'));
    modal.show();
}