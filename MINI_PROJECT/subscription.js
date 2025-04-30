document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const monthlyPrices = document.querySelectorAll('.amount.monthly');
    const yearlyPrices = document.querySelectorAll('.amount.yearly');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            button.classList.add('active');

            const isYearly = button.dataset.tab === 'yearly';
            
            // Toggle visibility of prices
            monthlyPrices.forEach(price => {
                price.style.display = isYearly ? 'none' : 'inline';
            });
            
            yearlyPrices.forEach(price => {
                price.style.display = isYearly ? 'inline' : 'none';
            });
        });
    });

    // Subscribe button functionality
    const subscribeButtons = document.querySelectorAll('.subscribe-btn');
    subscribeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const plan = this.closest('.plan-card').querySelector('h3').textContent;
            const isYearly = document.querySelector('.tab-btn.active').dataset.tab === 'yearly';
            const price = this.closest('.plan-card').querySelector(isYearly ? '.amount.yearly' : '.amount.monthly').textContent;
            
            // Here you would typically redirect to a payment gateway
            // For now, we'll just show an alert
            alert(`You have selected the ${plan} plan (${isYearly ? 'Yearly' : 'Monthly'}) at ${price}/month`);
        });
    });

    // Add hover effect to plan cards
    const planCards = document.querySelectorAll('.plan-card');
    planCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            if (!this.classList.contains('featured')) {
                this.style.transform = 'translateY(-10px)';
            }
        });

        card.addEventListener('mouseleave', function() {
            if (!this.classList.contains('featured')) {
                this.style.transform = 'translateY(0)';
            }
        });
    });
}); 