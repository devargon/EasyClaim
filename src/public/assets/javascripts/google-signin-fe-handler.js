
document.addEventListener('DOMContentLoaded', () => {
    function getMetaContent(name) {
        const metaTag = document.querySelector(`meta[name="${name}"]`);
        return metaTag ? metaTag.getAttribute('content') : null;
    }

    const googleSigninContainer = document.querySelector(".google-signin-container");
    let renderGoogleTimeout;

    // Function to create the Google Sign-In button
    function createGSIButton(container) {
        google.accounts.id.renderButton(container, {
            type: "button",
            width: container.getBoundingClientRect().width, // Full width
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            theme: "outline",
            logo_alignment: "left"
        });
    }

    function handleCredentialResponse(response) {
        document.getElementById("credential").value = response.credential;
        makeButtonLoad(document.getElementById("submit"));
        document.getElementById('google-onetap-signin').submit();
    }

    function initializeGoogleSignIn() {
        google.accounts.id.initialize({
            client_id: getMetaContent('nogra-oauth-google-clientid'),
            ux_mode: 'redirect',
            login_uri: getMetaContent('nogra-oauth-google-redirect-uri'),
            context: 'signin',
            itp_support: true,
            callback: handleCredentialResponse
        });

        googleSigninContainer.innerHTML = "";
        createGSIButton(googleSigninContainer);
        google.accounts.id.prompt();
    }


    if (googleSigninContainer.dataset.autoresize === "true") {
        window.addEventListener("resize", () => {
            clearTimeout(renderGoogleTimeout);
            renderGoogleTimeout = setTimeout(() => {
                googleSigninContainer.innerHTML = "";
                createGSIButton(googleSigninContainer);
            }, 200);
        });
    }

    if (window.google && google.accounts && google.accounts.id) {
        initializeGoogleSignIn();
    } else {
        window.addEventListener("google-loaded", initializeGoogleSignIn);
    }
    window.onload = function () {
        if (window.google && google.accounts && google.accounts.id) {
            const event = new Event("google-loaded");
            window.dispatchEvent(event);
        }
    };
});

