document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signup-form');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmpassword');

    const passwordRequirementsDisplay = document.getElementById('password-requirements-display');
    const confirmPasswordRequirementsDisplay = document.getElementById('confirmpassword-requirements-display');

    const passwordRequirements = {
        length: document.getElementById('length'),
        uppercase: document.getElementById('uppercase'),
        lowercase: document.getElementById('lowercase'),
        number: document.getElementById('number'),
    };

    const confirmPasswordRequirements = {
        passwordMatches: document.getElementById('passwordMatches')
    };

    function updatePasswordValidation() {
        const value = passwordInput.value;
        const validations = {
            length: value.length >= 6 && value.length <= 20,
            uppercase: /[A-Z]/.test(value),
            lowercase: /[a-z]/.test(value),
            number: /[0-9]/.test(value),
        };

        for (const key in validations) {
            const requirement = passwordRequirements[key];
            const icon = requirement.querySelector('i');

            if (validations[key]) {
                icon.classList.remove('bi-x');
                icon.classList.add('bi-check');
                requirement.classList.remove('text-danger');
                requirement.classList.add('text-success');
            } else {
                icon.classList.remove('bi-check');
                icon.classList.add('bi-x');
                requirement.classList.remove('text-success');
                requirement.classList.add('text-danger');
            }
        }

        // Revalidate the confirm password input if it has a value
        if (confirmPasswordInput.value) {
            confirmPasswordInput.dispatchEvent(new Event('input', { bubbles: true }));
            confirmPasswordInput.dispatchEvent(new Event('focus', { bubbles: true }));
            confirmPasswordInput.dispatchEvent(new Event('blur', { bubbles: true }));
        }
    }

    function updateConfirmPasswordValidation() {
        const value = confirmPasswordInput.value;
        const isMatching = value === passwordInput.value;
        const requirement = confirmPasswordRequirements.passwordMatches;
        const icon = requirement.querySelector('i');

        if (isMatching) {
            icon.classList.remove('bi-x', 'text-danger');
            icon.classList.add('bi-check', 'text-success');
            requirement.classList.remove('text-danger');
            requirement.classList.add('text-success');
        } else {
            icon.classList.remove('bi-check', 'text-success');
            icon.classList.add('bi-x', 'text-danger');
            requirement.classList.remove('text-success');
            requirement.classList.add('text-danger');
        }
    }

    function handlePasswordFocus() {
        passwordRequirementsDisplay.style.display = 'block';
    }

    function handlePasswordBlur() {
        if (!passwordRequirementsDisplay.querySelector('.text-danger')) {
            passwordRequirementsDisplay.style.display = 'none';
        }
    }

    function handleConfirmPasswordFocus() {
        confirmPasswordRequirementsDisplay.style.display = 'block';
    }

    function handleConfirmPasswordBlur() {
        if (!confirmPasswordRequirementsDisplay.querySelector('.text-danger')) {
            confirmPasswordRequirementsDisplay.style.display = 'none';
        }
    }

    function handleSubmit(event) {
        if (!signupForm.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
        }
        signupForm.classList.add('was-validated');
    }

    passwordInput.addEventListener("focus", handlePasswordFocus);
    passwordInput.addEventListener("blur", handlePasswordBlur);
    passwordInput.addEventListener('input', updatePasswordValidation);

    confirmPasswordInput.addEventListener("focus", handleConfirmPasswordFocus);
    confirmPasswordInput.addEventListener("blur", handleConfirmPasswordBlur);
    confirmPasswordInput.addEventListener('input', updateConfirmPasswordValidation);

    signupForm.addEventListener('submit', handleSubmit, false);
});
