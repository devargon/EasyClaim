document.addEventListener("DOMContentLoaded", () => {

    let initial_values = {};

    function clearAlert(selector) {
        document.querySelectorAll(selector).forEach(el => {
            el.innerHTML = "";
        })
    }

    function pushAlert(message, type, selector) {
        const alertElement = document.createElement("div")
        alertElement.innerText = message;
        alertElement.classList.add("alert", `alert-${type}`)
        alertElement.style.textAlign = "center";
        document.querySelector(selector).appendChild(alertElement);
        return alertElement;
    }

    const profileForm = document.querySelector(".profile-form");

    if (profileForm) {
        const profileNameElement = document.getElementById("name");
        initial_values.name = profileNameElement.value;

        profileForm.addEventListener("submit", async event => {
            clearAlert(".alert-container")
            makeButtonLoad(profileForm.querySelector("button[type='submit']"));
            event.preventDefault();
            event.stopPropagation();
            if (!profileForm.checkValidity() || !profileNameElement.value) {
                makeFormSubmitButtonUnload(event.target);
                pushAlert("Please enter a valid name.", "danger", ".alert-container");
                profileForm.classList.add('was-validated');
                return
            }
            if (profileNameElement.value === initial_values.name) {
                makeFormSubmitButtonUnload(event.target);
                return pushAlert("No changes were made.", "secondary", ".alert-container");
            }
            profileForm.classList.add('was-validated');
            let response;
            try {
                response = await fetch("/api/settings/profile", {
                    method: 'POST',
                    body: JSON.stringify({"name": profileNameElement.value}),
                    headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
                })
            } catch (e) {
                console.error("Failed to make request to update profile: ", e);
                pushAlert(`Could not update profile due to a connection issue.`, "danger", ".alert-container");
                return;
            }
            let response_json;
            try {
                response_json = await response.json();
            } catch (e) {
                console.error("Error while handling update user response: ", e);
                response_json = null;
            }
            if (response.ok) {
                if (response_json) {
                    initial_values.name = response_json.name;
                    document.querySelectorAll(".has-user-name").forEach(el => {
                        el.innerText = response_json.name
                    })
                    pushAlert("Profile updated successfully!", "success", ".alert-container");
                }
            }
            else {
                let error_message;
                if (response_json) {
                    error_message = response_json.error_message ? `${response_json.error_message} (${response.status})` : ``;
                }
                pushAlert("Could not update profile: " + (error_message || `An unknown error occured. (${response.status})`), "danger", ".alert-container");
            }
            makeFormSubmitButtonUnload(event.target);
        });
    }

    const emailForm = document.querySelector(".email-form")
    if (emailForm) {
        const accountEmailElement = document.getElementById("email");
        initial_values.email = accountEmailElement.value;

        emailForm.addEventListener("submit", async event => {
            clearAlert(".alert-container")
            makeButtonLoad(emailForm.querySelector("button[type='submit']"));
            event.preventDefault();
            event.stopPropagation();
            if (!emailForm.checkValidity() || !accountEmailElement.value) {
                makeFormSubmitButtonUnload(event.target);
                pushAlert("Please enter a valid email.", "danger", ".alert-container");
                emailForm.classList.add('was-validated');
                return
            }
            if (accountEmailElement.value === initial_values.email) {
                makeFormSubmitButtonUnload(event.target);
                return pushAlert("No changes were made.", "secondary", ".alert-container");
            }
            emailForm.classList.add('was-validated');
            let response;
            try {
                response = await fetch("/api/settings/account/email", {
                    method: 'POST',
                    body: JSON.stringify({"email": accountEmailElement.value}),
                    headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
                })
            } catch (e) {
                console.error("Failed to make request to update email: ", e);
                pushAlert(`Could not update email due to a connection issue.`, "danger", ".alert-container");
                return;
            }
            let response_json;
            try {
                response_json = await response.json();
            } catch (e) {
                console.error("Error while handling update email response: ", e);
                response_json = null;
            }
            if (response.ok) {
                if (response_json) {
                    pushAlert("Email updated successfully!", "success", ".alert-container");
                }
            }
            else {
                let error_message;
                if (response_json) {
                    error_message = response_json.error_message ? `${response_json.error_message} (${response.status})` : ``;
                }
                pushAlert("Could not update email: " + (error_message || `An unknown error occured. (${response.status})`), "danger", ".alert-container");
            }
            makeFormSubmitButtonUnload(event.target);
        });
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
            event.preventDefault();
            event.stopPropagation();
            passwordForm.classList.add('was-validated');
            if (!passwordForm.checkValidity()) {
                makeFormSubmitButtonUnload(event.target);
                return;
            }

            let response;
            try {
                response = await fetch("/api/settings/account/password", {
                    method: 'POST',
                    body: JSON.stringify({
                        'old_password': document.getElementById("old_password").value,
                        'password': document.getElementById("password").value,
                        'confirmpassword': document.getElementById("confirmpassword").value
                    }),
                    headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
                });
            } catch (e) {
                console.error("Failed to make request to update password: ", e);
                pushAlert(`Could not update password due to a connection issue.`, "danger", ".alert-container");
                return;
            }

            let response_json;
            try {
                response_json = await response.json();
            } catch (e) {
                console.error("Error while handling update password response: ", e);
                response_json = null;
            }

            if (response.ok) {
                if (response_json) {
                    pushAlert("Password changed!", "success", ".alert-container");
                }
            } else {
                let error_message;
                if (response_json) {
                    error_message = response_json.error_message ? `${response_json.error_message} (${response.status})` : ``;
                }
                pushAlert("Could not update password: " + (error_message || `An unknown error occurred. (${response.status})`), "danger", ".alert-container");
            }

            makeFormSubmitButtonUnload(event.target);
        });
    }
})