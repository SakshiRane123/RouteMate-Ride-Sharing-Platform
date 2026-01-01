// Handle ride deletion
document.addEventListener('DOMContentLoaded', function() {
    const deleteButtons = document.querySelectorAll('.delete-ride-btn');
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', async function() {
            const rideId = this.getAttribute('data-ride-id');
            const rideRoute = this.getAttribute('data-ride-route');
            
            // Confirm deletion
            const isConfirmed = confirm(`Are you sure you want to delete the ride:\n"${rideRoute}"?\n\nThis action cannot be undone.`);
            
            if (!isConfirmed) return;

            // Show loading state
            this.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Deleting...';
            this.disabled = true;

            try {
                const response = await fetch(`/api/rides/${rideId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                const result = await response.json();

                if (result.success) {
                    // Show success message
                    alert('Ride deleted successfully!');
                    
                    // Remove the ride card from the UI
                    const rideCard = this.closest('.card, tr');
                    if (rideCard) {
                        rideCard.style.opacity = '0';
                        setTimeout(() => {
                            rideCard.remove();
                            
                            // If no rides left, show message
                            const remainingRides = document.querySelectorAll('.card, tbody tr');
                            if (remainingRides.length === 0) {
                                location.reload(); // Reload to show empty state
                            }
                        }, 300);
                    } else {
                        location.reload(); // Fallback: reload page
                    }
                    
                } else {
                    alert(`Error: ${result.error}`);
                    // Reset button state
                    this.innerHTML = '<i class="bi bi-trash"></i> Delete';
                    this.disabled = false;
                }

            } catch (error) {
                console.error('Delete error:', error);
                alert('Failed to delete ride. Please try again.');
                // Reset button state
                this.innerHTML = '<i class="bi bi-trash"></i> Delete';
                this.disabled = false;
            }
        });
    });
});