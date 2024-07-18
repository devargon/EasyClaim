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

    // const createClaimModalElement = document.getElementById("createClaimModal");
    // const createClaimModal = new bootstrap.Modal(createClaimModalElement);
    // const claimOffsetAmtInput = document.getElementById("claim_offset_amt");
    // const createClaimModalEntriesSection = document.querySelector(".claim-expense-entries");
    // const createClaimButton = document.getElementById("make-claim");
    //
    // createClaimModalElement.addEventListener("show.bs.modal", () => {
    //     claimOffsetAmtInput.value = ""
    //     return claimOffsetAmtInput.dispatchEvent(new Event("input"));
    // })
    //
    // claimOffsetAmtInput.addEventListener("input", () => {
    //     if (handleCurrencyValue(claimOffsetAmtInput.value) !== claimOffsetAmtInput.value) {
    //         claimOffsetAmtInput.value = handleCurrencyValue(claimOffsetAmtInput.value);
    //     }
    //
    //     let newOffsetNumber = Number(claimOffsetAmtInput.value);
    //     if (isNaN(newOffsetNumber)) {
    //        newOffsetNumber = Number(0);
    //     }
    //     const claimSubtotalDiv = document.querySelector(".claim-total")
    //     let subtotal = Number(claimSubtotalDiv.dataset.subtotal)
    //     if (isNaN(subtotal)) {
    //         subtotal = Number(0);
    //     }
    //     if (newOffsetNumber > subtotal) {
    //         claimOffsetAmtInput.value = currency(subtotal).format({separator: '', symbol: ''});
    //         return claimOffsetAmtInput.dispatchEvent(new Event("input"));
    //     }
    //     document.querySelector(".offset-amt").innerText = currency(newOffsetNumber).format();
    //     const claimGrandtotalDiv = document.querySelector(".claim-grandtotal")
    //     claimGrandtotalDiv.innerText = currency(subtotal).subtract(newOffsetNumber).format();
    //
    // })
    //
    // const createClaimForm = document.getElementById("createClaimForm")
    // createClaimForm.addEventListener("submit", async (event) => {
    //     function completeError(error_message) {
    //         const createClaimAlert = document.getElementById("createClaimAlert");
    //         createClaimAlert.innerHTML = error_message;
    //         createClaimAlert.style.display = "block";
    //     }
    //     event.preventDefault();
    //
    //     let offsetAmount = Number(claimOffsetAmtInput.value);
    //     if (isNaN(offsetAmount)) offsetAmount = Number(0);
    //     if (offsetAmount < 0) {
    //         makeFormSubmitButtonUnload(createClaimForm);
    //         return completeError("Your offset amount cannot be lesser than $0.00.")
    //     }
    //     let newClaimResponse;
    //     try {
    //         newClaimResponse = await fetch("/api/claims/new", {
    //             method: "POST",
    //             body: JSON.stringify({
    //                 expenses: currentSelectedExpensesForClaim,
    //                 offsetAmount: offsetAmount
    //             }),
    //             headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
    //             credentials: 'same-origin',
    //             signal: AbortSignal.timeout(5000)
    //         })
    //     } catch (e) {
    //         return res.status(500).json({error_message: `Failed to create claim: ${e.toString()}`});
    //     } finally {
    //         makeFormSubmitButtonUnload(createClaimForm);
    //     }
    //     if (newClaimResponse.ok) {
    //         // window.location.href = "/claims";
    //         return completeError("OK");
    //     } else {
    //         try {
    //             const json_content = await newClaimResponse.json();
    //             return completeError(json_content.error_message || "Unable to create a claim. Please try again later.");
    //         } catch (error) {
    //             return completeError(`Unable to create a claim. Please try again later.`);
    //         }
    //     }
    //
    // })
    //
    //
    // function openClaimModal(expenseIds) {
    //     createClaimModalEntriesSection.innerHTML = "";
    //     const foundExpenses = [];
    //     if (expenseIds.length < 1) {
    //        return pushToast("You need to select at least one expense.", "Error creating claim", "danger");
    //     }
    //     let expenseClaimSubtotal = currency(0.00);
    //     expenseIds.forEach(expenseId => {
    //         const expenseCard = document.getElementById(`expense-${expenseId}`);
    //         if (expenseCard) {
    //             let expenseAmount, expenseDate, expenseCategoryName, expenseDescription;
    //             const expenseAmountDiv = expenseCard.querySelector(".expense-amount");
    //             if (expenseAmountDiv) expenseAmount = expenseAmountDiv.getAttribute("data-money");
    //             const expenseDateDiv = expenseCard.querySelector(".expense-date");
    //             if (expenseDateDiv) expenseDate = expenseDateDiv.getAttribute("data-iso");
    //             const expenseCategoryNameDiv = expenseCard.querySelector(".expense-category-name");
    //             if (expenseCategoryNameDiv) expenseCategoryName = expenseCategoryNameDiv.innerText;
    //             const expenseDescriptionDiv = expenseCard.querySelector(".expense-description");
    //             if (expenseDescriptionDiv) expenseDescription = expenseDescriptionDiv.innerText;
    //             const expenseInformalObj = {
    //                 amount: currency(expenseAmount),
    //                 date: new Date(expenseDate),
    //                 categoryName: expenseCategoryName,
    //                 description: expenseDescription,
    //             }
    //             if (!expenseInformalObj.amount) {
    //                 console.error(`Could not find expense amount information for #${expenseId}`)
    //             } else if (!(expenseInformalObj.categoryName || expenseInformalObj.description)) {
    //                 console.error(`Could not find expense cat or desc for ${expenseId}`);
    //             } else {
    //                 let entryNameArr = [];
    //                 if (expenseInformalObj.date) {
    //                     if (Object.prototype.toString.call(expenseInformalObj.date) === '[object Date]') {
    //                         entryNameArr.push(formatISOToLocaleDate(expenseInformalObj.date));
    //                     }
    //                 }
    //                 if (expenseInformalObj.categoryName) entryNameArr.push(expenseInformalObj.categoryName);
    //                 if (expenseInformalObj.description) entryNameArr.push(expenseInformalObj.description);
    //
    //
    //                 const claimExpenseEntryDiv = document.createElement("div")
    //                 claimExpenseEntryDiv.className = "claim-expense-entry";
    //                 const claimExpenseEntryNameContainerDiv = document.createElement("div");
    //                 claimExpenseEntryNameContainerDiv.className = "claim-expense-name-container";
    //                 const claimExpenseEntryNameInnerDiv = document.createElement("div");
    //                 claimExpenseEntryNameInnerDiv.className = "claim-expense-name-container";
    //                 claimExpenseEntryNameInnerDiv.innerText = entryNameArr.join(' \267 ');
    //                 claimExpenseEntryNameContainerDiv.appendChild(claimExpenseEntryNameInnerDiv);
    //                 const claimExpenseEntryAmtContainer = document.createElement("div");
    //                 claimExpenseEntryAmtContainer.className = "claim-expense-amount"
    //                 claimExpenseEntryAmtContainer.innerText = expenseInformalObj.amount.format();
    //                 claimExpenseEntryDiv.appendChild(claimExpenseEntryNameContainerDiv);
    //                 claimExpenseEntryDiv.appendChild(claimExpenseEntryAmtContainer);
    //                 createClaimModalEntriesSection.appendChild(claimExpenseEntryDiv);
    //                 expenseClaimSubtotal = expenseClaimSubtotal.add(expenseInformalObj.amount);
    //
    //                 foundExpenses.push(expenseInformalObj);
    //             }
    //         } else {
    //             console.error(`Could not find the Expense Card div for ${expenseId}`);
    //         }
    //     })
    //     if (foundExpenses.length === 0) {
    //         console.error("Failed to parse any selected expenses.");
    //         return pushToast("Hmm... Something is wrong. I could not find any expenses. Refresh the page and try again.", "Error creating expenses.", "danger");
    //     }
    //
    //     claimOffsetAmtInput.max = expenseClaimSubtotal.format({separator: '', symbol: ''});
    //
    //     const offsetAmtDiv = document.querySelector(".offset-amt");
    //     offsetAmtDiv.innerText = currency(0.00).format();
    //     const totalAmountDiv = document.querySelector(".claim-total");
    //     totalAmountDiv.innerText = expenseClaimSubtotal.format();
    //     totalAmountDiv.setAttribute("data-subtotal", expenseClaimSubtotal.format({separator: '', symbol: ''}))
    //
    //     currentSelectedExpensesForClaim = expenseIds;
    //     createClaimModal.show();
    // }

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
            case 'expand':
                if (target) target.setAttribute("disabled", "");
                renderExtendedClaimDetails(claimId).then(() => {if (target) target.removeAttribute("disabled")});
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

    async function renderExtendedClaimDetails(claimId) {}

    async function renderShareModal(claimId) {}
})