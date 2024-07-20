document.addEventListener('DOMContentLoaded', function() {

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

    function handleExpenseAction(action, claimId, target) {
        switch (action) {
            case 'cancel':
                renderCancelPrompt(claimId).then(() => {})
                break;
            case 'edit':
                if (target) target.setAttribute("disabled", "");
                renderEditPrompt(claimId).then(() => {if (target) target.removeAttribute("disabled")})
                break;
            case 'view':
                if (target) target.setAttribute("disabled", "");
                renderShowClaim(claimId).then(() => {if (target) target.removeAttribute("disabled")});
                break;
            case 'share':
                if (target) target.setAttribute("disabled", "");
                renderShareModal(claimId).then(() => {if (target) target.removeAttribute("disabled")});
                break;
            default:
                console.error("Event delegation encountered unknown action: ", action);
        }
    }

    async function renderEditPrompt(claimId) {
        return;
        let fetchExpenseResponse;
        try {
            fetchExpenseResponse = await fetch('/api/expenses/' + claimId, {
                method: 'get',
                credentials: 'same-origin',
                signal: AbortSignal.timeout(5000)
            })
        } catch (e) {
            console.error("Failed to read expense data: ", e);
            pushToast("I couldn't fetch details about this expense due to an error.", "Couldn't manage attachments", "danger");
            return;
        }
        let jsonResponse = null;
        try {
            jsonResponse = await fetchExpenseResponse.json();
        } catch (e) { // not JSON
            console.error("Failed to read expense data: ", e);
            pushToast("Could not fetch details about this expense due to an error.", "Couldn't manage attachments", "danger");
            return;
        }
        if (fetchExpenseResponse.status !== 200) {
            console.error("Unexpected status code received: ", fetchExpenseResponse.status);
            pushToast(jsonResponse?.error_message || "An unknown error occured.", "Couldn't manage attachments", "danger");
        } else expense_data = jsonResponse;

        if (expense_data) {
            expenseForm.setAttribute("data-expenseid", expense_data.id);
            expenseForm.setAttribute("data-purpose", "edit");

            document.getElementById("expense_amt").value = currency(expense_data.amount).format({ separator: '', symbol: '' });
            document.getElementById("category").value = expense_data.category.id;
            const now_dt = new Date();
            document.getElementById("spent_dt").value = new Date(new Date(expense_data.spentOn) - (now_dt.getTimezoneOffset() * 60 * 1000)).toISOString().slice(0, 16);
            document.getElementById("description").value = expense_data.description || "";
            createExpenseModal.show();
        } else {
            console.error("Failed to read expense data: ", e);
            pushToast("Could not fetch details about this expense due to an error.", "Couldn't edit attachment", "danger");
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

    let currentExpenseId = 0;

    async function renderShowClaim(shareId) {
        claimIframe.src = `/claims/shared/${shareId}`
        viewClaimModal.show();
    }

    viewClaimModalElement.addEventListener("hidden.bs.modal", event => {
        claimIframe.src = "about:blank";
        console.log("iFrame has nthing now")
    })

    async function renderShareModal(claimId) {}
})