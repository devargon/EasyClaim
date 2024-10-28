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

    const avatarSection = document.querySelector(".profile-picture-section");

    if (avatarSection) {
        const avatarInput = document.getElementById("avatar-edit-img-input");
        const profileAvatarMenu = document.getElementById("avatarMenu");
        let avatarImg = null;
        if (profileAvatarMenu) {avatarImg = profileAvatarMenu.querySelector(".avatar")}
        if (avatarImg) {
            const vueApp = Vue.createApp({
                data() {
                    return {
                        avatarSrc: avatarImg.dataset.initialAvatar
                    };
                },
                computed: {
                    isPlaceholderAvatar() {
                        return this.avatarSrc === "/avatar/default";
                    }
                },
                methods: {
                    changeAvatar(newUrl) {
                        this.avatarSrc = newUrl;
                        document.querySelectorAll("img.avatar").forEach(avImg => {
                            avImg.src = this.avatarSrc;
                        })
                    }
                },
                mounted() {
                    let self = this;
                    document.getElementById("post-avatar-btn").addEventListener("click", e => {
                        avatarInput.click();
                    });
                    document.getElementById("remove-avatar-btn").addEventListener("click", async e => {
                        const response = await fetch("/api/settings/avatar/delete", {method: 'POST',
                            headers: {'Accept': 'application/json'}
                        });
                        if (response.ok) {
                            self.changeAvatar("/avatar/default");
                            clearAlert(".alert-container");
                            pushAlert("Your profile picture was successfully removed.", "success", ".alert-container");
                        } else {
                            console.error(`Failed to delete profile picture: `, response.statusMessage);
                            clearAlert(".alert-container");
                            pushAlert("Could not delete your profile picture, please try again later.", "danger", ".alert-container");
                        }
                    })

                    let currentCropper;
                    let currentImageFilename;
                    const editAvatarModal = document.getElementById("edit-avatar-modal");
                    const editAvatarBsModal = new bootstrap.Modal(editAvatarModal);
                    const editAvatarImg = document.getElementById("edit-avatar-img");
                    const submitEditedAvatarBtn = document.getElementById("upload-avatar-btn");

                    avatarInput.addEventListener("change", async e => {
                        const file = e.target.files[0];
                        const actualMimeType = await loadMime(file);
                        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(actualMimeType)) {
                            clearAlert(".alert-container");
                            pushAlert("Wrong file format: Only JPEG/PNG images are accepted for a profile picture.", "danger", ".alert-container");
                            return;
                        }

                        currentImageFilename = file.name;
                        const imageBlobUrl = URL.createObjectURL(file);
                        editAvatarImg.src = imageBlobUrl;

                        // Ensure the image is loaded before showing the modal
                        editAvatarImg.onload = () => {
                            editAvatarBsModal.show();
                        };

                        editAvatarModal.addEventListener("shown.bs.modal", event => {
                            if (!currentCropper) {
                                currentCropper = new Cropper(editAvatarImg, {
                                    aspectRatio: 1,
                                    viewMode: 1,
                                    responsive: true,
                                    autoCropArea: 1,
                                });
                            }
                        });
                    });

                    editAvatarModal.addEventListener("hidden.bs.modal", event => {
                        if (currentCropper) {
                            currentCropper.destroy();
                            currentCropper = undefined;
                        }
                        avatarInput.value = '';
                        editAvatarImg.src = ''; // Reset the image source
                    });

                    submitEditedAvatarBtn.addEventListener("click", async e => {
                        try {
                            if (currentCropper) {
                                const croppedCanvas = currentCropper.getCroppedCanvas({
                                    maxWidth: 4096,
                                    maxHeight: 4096,
                                    imageSmoothingEnabled: true,
                                    imageSmoothingQuality: 'high',
                                });

                                croppedCanvas.toBlob(async function (blobby) {
                                    if (blobby) {
                                        const formData = new FormData();
                                        formData.append('avatar', blobby, currentImageFilename);
                                        editAvatarBsModal.hide();
                                        const response = await fetch("/api/settings/avatar", {
                                            method: 'POST',
                                            body: formData,
                                            headers: {'Accept': 'application/json'}
                                        });
                                        if (response.ok) {
                                            const json = await response.json();
                                            const newAvatarUrl = json.avatarUrl;
                                            clearAlert(".alert-container");
                                            pushAlert("Your profile picture is updated!", "success", ".alert-container");
                                            self.changeAvatar(newAvatarUrl);
                                        }
                                    } else {
                                        clearAlert(".modal-alert-container");
                                        pushAlert("Could not retrieve cropped image, please reload the page and try again", "danger", ".modal-alert-container");
                                    }
                                });
                            } else {
                                clearAlert(".modal-alert-container");
                                pushAlert("Image cropper wasn't initialized, please reload the page and try again.", "danger", ".modal-alert-container");
                            }
                        } catch (e) {
                            console.error(`Error while submitting cropped image`, e);
                            clearAlert(".modal-alert-container");
                            pushAlert("An error occurred, please refresh the page and try again.", "danger", ".modal-alert-container");
                        }
                    });
                }
            })
            vueApp.mount("#app");
        }
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
                const passwordFormBody = {
                    'password': document.getElementById("password").value,
                    'confirmpassword': document.getElementById("confirmpassword").value
                };
                if (document.getElementById("old_password")) {
                    passwordFormBody['old_password'] = document.getElementById("old_password").value;
                }
                response = await fetch("/api/settings/account/password", {
                    method: 'POST',
                    body: JSON.stringify(passwordFormBody),
                    headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
                });
            } catch (e) {
                makeFormSubmitButtonUnload(passwordForm);
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