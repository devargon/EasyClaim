document.addEventListener('DOMContentLoaded', function () {
    const otpForm = document.querySelector('.otp-form');
    if (otpForm) {
        const cooldown = otpForm.dataset.cd
        if (cooldown) {
            let cooldown_number = parseInt(cooldown);
            if (isNaN(cooldown_number) || cooldown_number <= 0) {
            } else {
                console.log("otp_cooldown is defined");
                const countdownElement = document.querySelector('.otp-cooldown-countdown');
                const otpRequestButton = document.getElementById('otp_request');

                function startCountdown() {
                    otpRequestButton.setAttribute('disabled', 'disabled');

                    // Immediately update the display with the initial countdown value
                    countdownElement.textContent = `(${cooldown_number})`;

                    const countdownInterval = setInterval(() => {
                        cooldown_number--;

                        if (cooldown_number > 0) {
                            countdownElement.textContent = `(${cooldown_number})`; // Update countdown display
                        } else {
                            clearInterval(countdownInterval);
                            countdownElement.textContent = '';
                            otpRequestButton.removeAttribute('disabled');
                        }
                    }, 1000);
                }
                startCountdown();
            }
        }
    }

    const passwordForm = document.querySelector(".password-form");
    if (passwordForm) {
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmpassword');

        const passwordRequirementsDisplay = document.getElementById('password-requirements-display');
        const confirmPasswordRequirementsDisplay = document.getElementById('confirmpassword-requirements-display');

        // Initialize the password validation
        initPasswordValidation(passwordInput, confirmPasswordInput, passwordRequirementsDisplay, confirmPasswordRequirementsDisplay);

        // Keep the rest of your password form submission logic intact
        passwordForm.addEventListener("submit", async function(event) {
            clearAlert(".alert-container");
            makeButtonLoad(passwordForm.querySelector("button[type='submit']"));

            passwordForm.classList.add('was-validated');
            if (!passwordForm.checkValidity()) {
                makeFormSubmitButtonUnload(event.target);
                event.preventDefault();
                event.stopPropagation();
            }
        });
    }
});
