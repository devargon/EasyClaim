const app = Vue.createApp({
    data() {
        return {
            offset: 0.00,
        }
    },
    methods: {
    }
});

const vm = app.mount('#app');

document.addEventListener('DOMContentLoaded', function() {
    function fallbackCopyTextToClipboard(text) {
        var textArea = document.createElement("textarea");
        textArea.value = text;

        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        document.body.removeChild(textArea);
        return true;
    }
    function copyTextToClipboard(text) {
        if (!navigator.clipboard) {
            fallbackCopyTextToClipboard(text);
            return;
        }
        navigator.clipboard.writeText(text).then(function() {
            return true;
        }, function(err) {
            throw err;
        });
    }


    let currentClaimShareURL = "";

    const claimOffsetAmtInput = document.getElementById("claim_offset_amt");
    const createClaimModalEntriesSection = document.getElementById("actualClaimExpenseList");
    const editClaimModalElement = document.getElementById("editClaimModal");
    const editClaimModal = new bootstrap.Modal(editClaimModalElement)
    const claimGrandtotalDiv = document.querySelector(".claim-grandtotal")

    claimOffsetAmtInput.addEventListener("input", () => {
        if (handleCurrencyValue(claimOffsetAmtInput.value) !== claimOffsetAmtInput.value) {
            claimOffsetAmtInput.value = handleCurrencyValue(claimOffsetAmtInput.value);
            vm.offset = Number(claimOffsetAmtInput.value);
        }

        let newOffsetNumber = Number(claimOffsetAmtInput.value);
        if (isNaN(newOffsetNumber)) {
            newOffsetNumber = Number(0);
        }
        const claimSubtotalDiv = document.querySelector(".claim-total")
        let subtotal = Number(claimSubtotalDiv.dataset.subtotal)
        if (isNaN(subtotal)) {
            subtotal = Number(0);
        }
        if (newOffsetNumber > subtotal) {
            claimOffsetAmtInput.value = currency(subtotal).format({separator: '', symbol: ''});
            return claimOffsetAmtInput.dispatchEvent(new Event("input"));
        }
        document.querySelector(".offset-amt").innerText = currency(newOffsetNumber).format();
        claimGrandtotalDiv.innerText = currency(subtotal).subtract(newOffsetNumber).format();
    })

    const editClaimForm = document.getElementById("editClaimForm")
    editClaimForm.addEventListener("submit", async (event) => {

        function completeError(error_message) {
            const editClaimAlert = document.getElementById("editClaimAlert");
            editClaimAlert.innerHTML = error_message;
            editClaimAlert.style.display = "block";
        }
        event.preventDefault();
        const claimId = parseInt(editClaimForm.dataset.claimid);
        if (isNaN(claimId)) {
            makeFormSubmitButtonUnload();
            return completeError("Hmm... Something went wrong. Please refresh the page and try again.");
        }

        let offsetAmount = Number(claimOffsetAmtInput.value);
        if (isNaN(offsetAmount)) offsetAmount = Number(0);
        if (offsetAmount < 0) {
            makeFormSubmitButtonUnload(editClaimForm);
            return completeError("Your offset amount cannot be lesser than $0.00.")
        }
        let newClaimResponse;
        try {
            newClaimResponse = await fetch(`/api/claims/${claimId}/edit`, {
                method: "POST",
                body: JSON.stringify({
                    offsetAmount: offsetAmount
                }),
                headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                credentials: 'same-origin',
                signal: AbortSignal.timeout(5000)
            })
        } catch (e) {
            return res.status(500).json({error_message: `Failed to edit claim: ${e.toString()}`});
        } finally {
            makeFormSubmitButtonUnload(editClaimForm);
        }
        if (newClaimResponse.ok) {
            return window.location.href = "/claims";
        } else {
            try {
                const json_content = await newClaimResponse.json();
                return completeError(json_content.error_message || "Unable to edit your claim. Please try again later.");
            } catch (error) {
                return completeError(`Unable to edit your claim. Please try again later.`);
            }
        }
    })


    async function openClaimModal(claimId) {
        let getClaimResponse;
        try {
            getClaimResponse = await fetch(`/api/claims/${claimId}`, {
                method: "GET",
                headers: {'Accept': 'application/json'},
                credentials: 'same-origin',
                signal: AbortSignal.timeout(5000)
            });
        } catch (e) {
            console.error("Failed to get claim data: ", e);
            return pushToast("I couldn't fetch details about this claim due to an error.", "Couldn't manage claim", "danger");
        }
        if (!getClaimResponse.ok) {
            console.error(`Failed to get claim data: Server returned ${getClaimResponse.status}`);
            return pushToast(`I couldn't fetch details about this claim due to an error. (Server returned ${getClaimResponse.status})`, "Couldn't manage claim", "danger");
        }
        let jsonResponse;
        try {
            jsonResponse = await getClaimResponse.json();
        } catch (e) {
            console.error("Failed to get claim data: ", e);
            return pushToast(`Hmm... Something's not right. I couldn't fetch details about this claim. `, "Couldn't manage claim", "danger");
        }
        try {
            createClaimModalEntriesSection.innerHTML = "";
            editClaimForm.setAttribute("data-claimid", jsonResponse.id);
            generateExpenseDivForClaimModal(jsonResponse.expenses, createClaimModalEntriesSection);


            claimOffsetAmtInput.max = currency(jsonResponse.totalAmount).format({separator: '', symbol: ''});
            claimOffsetAmtInput.value = currency(jsonResponse.claimOffset).format({separator: '', symbol: ''});
            vm.offset = Number(jsonResponse.claimOffset);

            const offsetAmtDiv = document.querySelector(".offset-amt");
            offsetAmtDiv.innerText = currency(jsonResponse.claimOffset).format();
            const totalAmountDiv = document.querySelector(".claim-total");
            totalAmountDiv.innerText = currency(jsonResponse.totalAmount).format();
            totalAmountDiv.setAttribute("data-subtotal", currency(jsonResponse.totalAmount).format({separator: '', symbol: ''}));
            claimGrandtotalDiv.innerText = currency(jsonResponse.totalAmountAfterOffset).format();
            editClaimModal.show();
        } catch (e) {
            console.error("Failed to render modal contents: ", e);
            return pushToast(`An error occured while trying to let you edit the claim. Please try again later.`, "Couldn't manage claim", "danger");
        }

    }

    function handleCurrencyValue(value) {
        value = value.replace(/[^0-9.]/g, '');
        if (value === '') {
            return value;
        }
        let parts = value.split('.');
        console.log(parts);

        // If there are more than 2 decimal places, truncate to 2
        if (parts.length > 1 && parts[1].length > 2) {
            parts[1] = parts[1].slice(0, 2);
        }
        return parts.join('.');
    }

    const viewClaimModalElement = document.getElementById("viewClaimModal");
    const viewClaimModal = new bootstrap.Modal(viewClaimModalElement);
    const claimIframe = document.getElementById("viewClaimIframe");

    function pushToast(message, header, type) {
        let color;
        color = type ? `text-bg-${type} border-0` : "";
        const toastElement = document.createElement("div");
        toastElement.className = `toast ${color}`
        toastElement.setAttribute("role", "alert");
        toastElement.setAttribute('aria-live', 'assertive');
        toastElement.setAttribute('aria-atomic', 'true');
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "btn-close";
        closeBtn.setAttribute("data-bs-dismiss", "toast");
        closeBtn.setAttribute("aria-label", "Close");
        if (header) {
            const toastHeader = document.createElement("div");
            toastHeader.className = "toast-header";
            const headerElement = document.createElement("strong")
            headerElement.className = "me-auto";
            headerElement.innerText = header;
            toastHeader.appendChild(headerElement);
            toastHeader.appendChild(closeBtn);
            toastElement.appendChild(toastHeader);
        }

        const toastBody = document.createElement("div");
        toastBody.className = "toast-body";
        toastBody.innerText = message;
        if (!header) {
            const dFlexDiv = document.createElement("div");
            dFlexDiv.className = "d-flex";
            dFlexDiv.appendChild(toastBody);
            closeBtn.classList.add("me-2", "m-auto");
            dFlexDiv.appendChild(closeBtn);
            toastElement.appendChild(dFlexDiv);
        } else {
            toastElement.appendChild(toastBody);
        }
        document.querySelector('.toast-container').appendChild(toastElement);

        const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 4000});
        toast.show();

        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    function formatMoney (money) {
        let currency_disp
        try {
            currency_disp = currency(money).format();
        } catch {
            currency_disp = "$" + Number(money).toFixed(2)
        }
        return currency_disp;
    }

    document.querySelector(".claim-container").addEventListener("click", function(event) {
        let target = event.target;
        if (!target) return;
        // console.log(target);
        // in case user clicked on <i> icon
        if ((target.tagName === 'I' && target.parentElement.classList.contains('action-button')) || (target.tagName === 'IMG')) {
            target = target.parentElement;
        }
        if (target.classList.contains('action-button')) {
            console.log("Event has action-button class.");
            event.preventDefault();
            event.stopPropagation();
            const action = target.getAttribute('data-action');
            const claimId = target.getAttribute('data-claim-id');
            handleExpenseAction(action, claimId, target);
        }
    });

    const shareClaimModalElement = document.getElementById("shareClaimModal");
    const shareClaimModal = new bootstrap.Modal(shareClaimModalElement);
    const shareClaimUrlInput = document.getElementById("claim-share-link-input");
    const claimMessageContent = document.getElementById("imessage-msg");
    const shareClaimCopyUrlBtn = document.getElementById("copy-link-btn");
    const missingLanguageAlert = document.getElementById("missing-language-alert");
    const missingLanguageDisplay = document.getElementById("selected-missing-language");
    let just_copied = false;
    let selected_message_language = "en";
    let message_strings = {"en": "Among Us"};
    let messageLanguageSelect = document.getElementById("message-language");
    let default_message = "";
    let default_url = "";
    let default_html = "";

    function getStuff() {
        const language = message_strings[selected_message_language];
        let html = default_html;
        let url = default_url;
        let message = default_message;
        if (language) {
            html = language.html;
            url = language.url;
            message = language.message;
        }
        return { html, url, message }
    }
    function updateExampleMessage() {
        const language = getStuff()
        claimMessageContent.innerHTML = language.html;
        shareClaimUrlInput.value = language.url;
    }
    messageLanguageSelect.addEventListener("change", function(e) {
        selected_message_language = messageLanguageSelect.value;
        if (message_strings[selected_message_language] === undefined) {
            missingLanguageAlert.style.display = "block";
            missingLanguageDisplay.innerText = messageLanguageSelect.options[messageLanguageSelect.selectedIndex].text;
        } else {
            missingLanguageDisplay.innerText = "";
            missingLanguageAlert.style.display = "none";
        }
        updateExampleMessage();

    })
    shareClaimModalElement.addEventListener("hidden.bs.modal", () => {
        shareClaimUrlInput.value = "";
        currentClaimShareURL = null;
    });
    shareClaimUrlInput.addEventListener("focus", () => {
        shareClaimUrlInput.select();
    })
    shareClaimCopyUrlBtn.addEventListener("click", () => {
        let URLToShare = getStuff().url;
        if (URLToShare && !just_copied ) {
            try {
                copyTextToClipboard(URLToShare);
                const a = document.createElement("div")
                b = document.createElement("i")
                b.className = "bi bi-check2";
                a.appendChild(b)
                a.appendChild(document.createTextNode(" Copied to clipboard!"));
                const oldBtnHTML = shareClaimCopyUrlBtn.innerHTML;
                shareClaimCopyUrlBtn.classList.remove("btn-outline-secondary");
                shareClaimCopyUrlBtn.classList.add("btn-outline-success");
                shareClaimCopyUrlBtn.innerHTML = a.innerHTML;
                just_copied = true;
                setTimeout(() => {
                        shareClaimCopyUrlBtn.innerHTML = oldBtnHTML;
                        shareClaimCopyUrlBtn.classList.add("btn-outline-secondary");
                        shareClaimCopyUrlBtn.classList.remove("btn-outline-success");
                        just_copied = false;
                    }, 2000
                );
            } catch (e) {
                console.error("Failed to copy to clipboard: ", e);
                return pushToast("Failed to copy to clipboard, please copy the link manually.", null, "danger");
            }
        }
    })




    function handleExpenseAction(action, claimId, target) {
        switch (action) {
            case 'cancel':
                renderCancelPrompt(claimId).then(() => {})
                break;
            case 'edit':
                if (target) target.setAttribute("disabled", "");
                openClaimModal(claimId).then(() => {if (target) target.removeAttribute("disabled")})
                break;
            case 'view':
                if (target) target.setAttribute("disabled", "");
                renderShowClaim(claimId).then(() => {if (target) target.removeAttribute("disabled")});
                break;
            case 'share':
                if (target) target.setAttribute("disabled", "");
                renderShareModal(claimId).then(() => {if (target) target.removeAttribute("disabled")});
                break;
            case 'complete':
                if (target) target.setAttribute("disabled", "");
                renderCompletePrompt(claimId).then(() => {if (target) target.removeAttribute("disabled")});
            default:
                console.error("Event delegation encountered unknown action: ", action);
        }
    }

    async function renderCancelPrompt(claimId) {
        const card = document.getElementById(`claim-${claimId}`);
        const promptOverlay = document.createElement("div")
        promptOverlay.className = "overlay";

        const promptOverlayContent = document.createElement("div")
        promptOverlayContent.className = "content";

        const promptOverlayText = document.createElement("p");
        promptOverlayText.innerText = "Are you sure you want to cancel this claim?";

        const promptOverlayActions = document.createElement("div");
        promptOverlayActions.className = "action";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn btn-danger";
        cancelBtn.innerHTML = "<i class='bi bi-trash3-fill'></i> Cancel"

        const cancelActionBtn = document.createElement("button");
        cancelActionBtn.className = "btn btn-secondary";
        cancelActionBtn.innerText = "Cancel";

        cancelBtn.addEventListener("click", async function() {
            try {
                const deleteResult = await fetch(`/api/claims/${claimId}/cancel`, {
                    method: "POST",
                    headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                    signal: AbortSignal.timeout(5000),
                    credentials: 'same-origin'
                })
                if (deleteResult.ok) {
                    promptOverlay.remove();
                    window.location.reload();
                } else {
                    let error_message = "An error occured while cancelling this claim."
                    try {
                        const jsonError = await deleteResult.json();
                        if (jsonError.error_message) {
                            error_message = `This claim can't be deleted: ${jsonError.error_message}`;
                        }
                    } catch {}
                    pushToast(error_message, "Error", "danger");
                }
            } catch (e) {
                console.error(e);
                pushToast("An error occured while deleting this claim.", "Error", "danger");
            }

        })

        cancelActionBtn.addEventListener("click", function() {
            promptOverlay.remove();
        });

        promptOverlayActions.appendChild(cancelBtn);
        promptOverlayActions.appendChild(cancelActionBtn);

        promptOverlayContent.appendChild(promptOverlayText);
        promptOverlayContent.appendChild(promptOverlayActions);

        promptOverlay.appendChild(promptOverlayContent);

        card.querySelector(".expense-claim-card-contents").appendChild(promptOverlay);
    }

    async function renderCompletePrompt(claimId) {
        const card = document.getElementById(`claim-${claimId}`);
        const promptOverlay = document.createElement("div")
        promptOverlay.className = "overlay";

        const promptOverlayContent = document.createElement("div")
        promptOverlayContent.className = "content";

        const promptOverlayText = document.createElement("p");
        promptOverlayText.innerText = "Are you sure you want to cancel this claim?";

        const promptOverlayActions = document.createElement("div");
        promptOverlayActions.className = "action";

        const completeBtn = document.createElement("button");
        completeBtn.className = "btn btn-success";
        completeBtn.innerHTML = "<i class='bi bi-check2'></i> Complete"

        const cancelActionBtn = document.createElement("button");
        cancelActionBtn.className = "btn btn-secondary";
        cancelActionBtn.innerText = "Cancel";

        completeBtn.addEventListener("click", async function() {
            try {
                const completeResult = await fetch(`/api/claims/${claimId}/complete`, {
                    method: "POST",
                    headers: {'Accept': 'application/json'},
                    signal: AbortSignal.timeout(5000),
                    credentials: 'same-origin'
                })
                if (completeResult.ok) {
                    promptOverlay.remove();
                    window.location.reload();
                } else {
                    let error_message = "An error occured while marking this claim as complete."
                    try {
                        const jsonError = await completeResult.json();
                        if (jsonError.error_message) {
                            error_message = `This claim can't be marked as complete: ${jsonError.error_message}`;
                        }
                    } catch {}
                    pushToast(error_message, "Error", "danger");
                }
            } catch (e) {
                console.error(e);
                pushToast("An error occured while marking this claim as complete.", "Error", "danger");
            }

        })

        cancelActionBtn.addEventListener("click", function() {
            promptOverlay.remove();
        });

        promptOverlayActions.appendChild(completeBtn);
        promptOverlayActions.appendChild(cancelActionBtn);

        promptOverlayContent.appendChild(promptOverlayText);
        promptOverlayContent.appendChild(promptOverlayActions);

        promptOverlay.appendChild(promptOverlayContent);

        card.querySelector(".expense-claim-card-contents").appendChild(promptOverlay);
    }

    let currentExpenseId = 0;

    async function renderShowClaim(shareId) {
        claimIframe.src = `/claims/share/${shareId}`
        viewClaimModal.show();
    }

    viewClaimModalElement.addEventListener("hidden.bs.modal", event => {
        claimIframe.src = "about:blank";
    })

    document.querySelector(".share-buttons").addEventListener("click", (e) => {
        const button = e.target.closest('.social-share-btn');
        console.log(button);
        if (!button || !button.id) {
            return;
        }
        const language = getStuff();
        const message_encoded = encodeURIComponent(language.message);
        switch(button.id) {
            case "whatsapp-share":
                console.log("WhatsApp");
                window.location.href = `whatsapp://send?text=${message_encoded}`;
                break;
            case "telegram-share":
                console.log("Telegram");
                const message_without_link = language.message.replace(language.url, "");
                window.location.href = `tg://msg_url?url=${encodeURIComponent(language.url)}&text=${message_without_link}`;
                break;
            case "line-share":
                console.log("Line");
                window.location.href = `line://msg/text/${message_encoded}`;
                break;
            case "others-share":
                if (navigator.share) {
                    console.log("navigator.share is defined");
                    const share_data = {
                        text: language.message
                    }
                    if (navigator.canShare(share_data)) {
                        navigator.share(share_data)
                    } else {
                        console.log("cannot share");
                    }
                }
                console.log("Others");
                break;
            default:
                console.log("Unknown share button clicked");
        }
    })

    async function renderShareModal(claimId) {
        try {
            const getShareURLResponse = await fetch(`/api/claims/${claimId}/share`, {
                method: "GET",
                headers: {'Accept': 'application/json'},
                credentials: 'same-origin',
                signal: AbortSignal.timeout(5000),
            });
            if (getShareURLResponse.ok) {
                let jsonResponse = await getShareURLResponse.json();
                selected_message_language = "en";
                messageLanguageSelect.value = selected_message_language;
                message_strings = jsonResponse.messages;
                default_url = jsonResponse.default_url;
                default_message = jsonResponse.default_message;
                default_html = jsonResponse.default_html;
                updateExampleMessage();
                shareClaimModal.show();
            } else {
                if (getShareURLResponse.status === 404) {
                    return pushToast("I could not find that claim.", "Could not open share prompt", "danger");
                } else {
                    return pushToast(`Unexpected response ${getShareURLResponse.status}`, "Could not open share prompt", "danger");
                }

            }
        } catch (e) {
            console.error(e);
            pushToast("An error occured, please try again later.", "Could not open share prompt", "danger");

        }
    }

    if (!(navigator.share && navigator.canShare({text: "abc"}))) {
        document.getElementById("others-share").remove();
        document.getElementById("others-button-description").remove()
    };
})