document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Only add menu event listener if the element exists
    const menuButton = document.querySelector(".icon-menu");
    if (menuButton) {
        menuButton.addEventListener("click", function (event) {
            event.preventDefault();
            document.body.classList.toggle("menu-open");
        });
    }

    // Only add spoller event listeners if elements exist
    const spollerButtons = document.querySelectorAll("[data-spoller] .spollers-faq__button");
    if (spollerButtons.length > 0) {
        spollerButtons.forEach((button) => {
            button.addEventListener("click", function () {
                const currentItem = button.closest("[data-spoller]");
                const content = currentItem.querySelector(".spollers-faq__text");

                const parent = currentItem.parentNode;
                const isOneSpoller = parent.hasAttribute("data-one-spoller");

                if (isOneSpoller) {
                    const allItems = parent.querySelectorAll("[data-spoller]");
                    allItems.forEach((item) => {
                        if (item !== currentItem) {
                            const otherContent = item.querySelector(".spollers-faq__text");
                            item.classList.remove("active");
                            otherContent.style.maxHeight = null;
                        }
                    });
                }

                if (currentItem.classList.contains("active")) {
                    currentItem.classList.remove("active");
                    content.style.maxHeight = null;
                } else {
                    currentItem.classList.add("active");
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            });
        });
    }

    // Form submission code
    const form = document.getElementById('waitlist-form');
    console.log('Form element:', form);
    
    if (!form) {
        console.error('Waitlist form not found!');
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const nameInput = form.querySelector('#fullname');
    const emailInput = form.querySelector('#email');

    console.log('Submit button:', submitButton);
    console.log('Name input:', nameInput);
    console.log('Email input:', emailInput);

    form.addEventListener('submit', async function(e) {
        console.log('Form submitted');
        e.preventDefault();
        
        // Disable submit button and show loading state
        submitButton.disabled = true;
        submitButton.textContent = 'Joining...';
        
        try {
            console.log('Sending request to server...');
            const response = await fetch('http://localhost:3000/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: nameInput.value,
                    email: emailInput.value
                })
            });

            console.log('Response received:', response);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                // Show success message
                alert('Thank you for joining the waitlist!');
                form.reset();
            } else {
                // Show error message
                alert(data.message || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Something went wrong. Please try again.');
        } finally {
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.textContent = 'Join Waitlist';
        }
    });
});
