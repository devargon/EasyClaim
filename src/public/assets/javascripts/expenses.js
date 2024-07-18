const app = Vue.createApp({
    data() {
        return {
            selectedExpenses: [],
            offset: 0.00,
            showingCompletedExpenses: false
        }
    },
    methods: {
    }
});

// Mount the app to the DOM element with id 'app'
const vm = app.mount('#app');

document.addEventListener('DOMContentLoaded', function() {

    let currentSelectedExpensesForClaim = [];

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

    const addExpenseAmountInput = document.getElementById('expense_amt');
    addExpenseAmountInput.addEventListener("input", () => {
        if (handleCurrencyValue(addExpenseAmountInput.value) !== addExpenseAmountInput.value) {
            addExpenseAmountInput.value = handleCurrencyValue(addExpenseAmountInput.value);
        }
    })

    const createClaimModalElement = document.getElementById("createClaimModal");
    const createClaimModal = new bootstrap.Modal(createClaimModalElement);
    const claimOffsetAmtInput = document.getElementById("claim_offset_amt");
    const createClaimModalEntriesSection = document.querySelector(".claim-expense-entries");
    const createClaimButton = document.getElementById("make-claim");
    createClaimButton.addEventListener("click", function() {
        if (vm.selectedExpenses.length > 0) {
            openClaimModal(vm.selectedExpenses);
        } else {
            pushToast("You need to select at least one expense to make a claim.", "", "warning");
        }
    })

    createClaimModalElement.addEventListener("show.bs.modal", () => {
        claimOffsetAmtInput.value = ""
        return claimOffsetAmtInput.dispatchEvent(new Event("input"));
    })

    claimOffsetAmtInput.addEventListener("input", () => {
        if (handleCurrencyValue(claimOffsetAmtInput.value) !== claimOffsetAmtInput.value) {
            claimOffsetAmtInput.value = handleCurrencyValue(claimOffsetAmtInput.value);
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
        const claimGrandtotalDiv = document.querySelector(".claim-grandtotal")
        claimGrandtotalDiv.innerText = currency(subtotal).subtract(newOffsetNumber).format();

    })

    const createClaimForm = document.getElementById("createClaimForm")
    createClaimForm.addEventListener("submit", async (event) => {
        function completeError(error_message) {
            const createClaimAlert = document.getElementById("createClaimAlert");
            createClaimAlert.innerHTML = error_message;
            createClaimAlert.style.display = "block";
        }
        event.preventDefault();

        let offsetAmount = Number(claimOffsetAmtInput.value);
        if (isNaN(offsetAmount)) offsetAmount = Number(0);
        if (offsetAmount < 0) {
            makeFormSubmitButtonUnload(createClaimForm);
            return completeError("Your offset amount cannot be lesser than $0.00.")
        }
        let newClaimResponse;
        try {
            newClaimResponse = await fetch("/api/claims/new", {
                method: "POST",
                body: JSON.stringify({
                    expenses: currentSelectedExpensesForClaim,
                    offsetAmount: offsetAmount
                }),
                headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                credentials: 'same-origin',
                signal: AbortSignal.timeout(5000)
            })
        } catch (e) {
            return res.status(500).json({error_message: `Failed to create claim: ${e.toString()}`});
        } finally {
            makeFormSubmitButtonUnload(createClaimForm);
        }
        if (newClaimResponse.ok) {
            // window.location.href = "/claims";
            return completeError("OK");
        } else {
            try {
                const json_content = await newClaimResponse.json();
                return completeError(json_content.error_message || "Unable to create a claim. Please try again later.");
            } catch (error) {
                return completeError(`Unable to create a claim. Please try again later.`);
            }
        }

    })


    function openClaimModal(expenseIds) {
        createClaimModalEntriesSection.innerHTML = "";
        const foundExpenses = [];
        if (expenseIds.length < 1) {
           return pushToast("You need to select at least one expense.", "Error creating claim", "danger");
        }
        let expenseClaimSubtotal = currency(0.00);
        expenseIds.forEach(expenseId => {
            const expenseCard = document.getElementById(`expense-${expenseId}`);
            if (expenseCard) {
                let expenseAmount, expenseDate, expenseCategoryName, expenseDescription;
                const expenseAmountDiv = expenseCard.querySelector(".expense-amount");
                if (expenseAmountDiv) expenseAmount = expenseAmountDiv.getAttribute("data-money");
                const expenseDateDiv = expenseCard.querySelector(".expense-date");
                if (expenseDateDiv) expenseDate = expenseDateDiv.getAttribute("data-iso");
                const expenseCategoryNameDiv = expenseCard.querySelector(".expense-category-name");
                if (expenseCategoryNameDiv) expenseCategoryName = expenseCategoryNameDiv.innerText;
                const expenseDescriptionDiv = expenseCard.querySelector(".expense-description");
                if (expenseDescriptionDiv) expenseDescription = expenseDescriptionDiv.innerText;
                const expenseInformalObj = {
                    amount: currency(expenseAmount),
                    date: new Date(expenseDate),
                    categoryName: expenseCategoryName,
                    description: expenseDescription,
                }
                if (!expenseInformalObj.amount) {
                    console.error(`Could not find expense amount information for #${expenseId}`)
                } else if (!(expenseInformalObj.categoryName || expenseInformalObj.description)) {
                    console.error(`Could not find expense cat or desc for ${expenseId}`);
                } else {
                    let entryNameArr = [];
                    if (expenseInformalObj.date) {
                        if (Object.prototype.toString.call(expenseInformalObj.date) === '[object Date]') {
                            entryNameArr.push(formatISOToLocaleDate(expenseInformalObj.date));
                        }
                    }
                    if (expenseInformalObj.categoryName) entryNameArr.push(expenseInformalObj.categoryName);
                    if (expenseInformalObj.description) entryNameArr.push(expenseInformalObj.description);


                    const claimExpenseEntryDiv = document.createElement("div")
                    claimExpenseEntryDiv.className = "claim-expense-entry";
                    const claimExpenseEntryNameContainerDiv = document.createElement("div");
                    claimExpenseEntryNameContainerDiv.className = "claim-expense-name-container";
                    const claimExpenseEntryNameInnerDiv = document.createElement("div");
                    claimExpenseEntryNameInnerDiv.className = "claim-expense-name-container";
                    claimExpenseEntryNameInnerDiv.innerText = entryNameArr.join(' \267 ');
                    claimExpenseEntryNameContainerDiv.appendChild(claimExpenseEntryNameInnerDiv);
                    const claimExpenseEntryAmtContainer = document.createElement("div");
                    claimExpenseEntryAmtContainer.className = "claim-expense-amount"
                    claimExpenseEntryAmtContainer.innerText = expenseInformalObj.amount.format();
                    claimExpenseEntryDiv.appendChild(claimExpenseEntryNameContainerDiv);
                    claimExpenseEntryDiv.appendChild(claimExpenseEntryAmtContainer);
                    createClaimModalEntriesSection.appendChild(claimExpenseEntryDiv);
                    expenseClaimSubtotal = expenseClaimSubtotal.add(expenseInformalObj.amount);

                    foundExpenses.push(expenseInformalObj);
                }
            } else {
                console.error(`Could not find the Expense Card div for ${expenseId}`);
            }
        })
        if (foundExpenses.length === 0) {
            console.error("Failed to parse any selected expenses.");
            return pushToast("Hmm... Something is wrong. I could not find any expenses. Refresh the page and try again.", "Error creating expenses.", "danger");
        }

        claimOffsetAmtInput.max = expenseClaimSubtotal.format({separator: '', symbol: ''});

        const offsetAmtDiv = document.querySelector(".offset-amt");
        offsetAmtDiv.innerText = currency(0.00).format();
        const totalAmountDiv = document.querySelector(".claim-total");
        totalAmountDiv.innerText = expenseClaimSubtotal.format();
        totalAmountDiv.setAttribute("data-subtotal", expenseClaimSubtotal.format({separator: '', symbol: ''}))

        currentSelectedExpensesForClaim = expenseIds;
        createClaimModal.show();
    }

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

    document.getElementById("incompleteExpenses").addEventListener("click", function(event) {
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
            const expenseId = target.getAttribute('data-expense-id');
            handleExpenseAction(action, expenseId, target);
        } else if (target.tagName === 'BUTTON' || target.classList.contains('btn') || target.classList.contains('expense-card-attachment')) {
            // Handled on its own
        } else {
            target = target.closest('.expense-card');
            if (target) {
                handleCardTouch(target);
            }

        }
    });

    function handleCardTouch(target) {
        const card_checkbox = target.querySelector('input[type="checkbox"]');
        card_checkbox.click();``
        target.classList.toggle('selected-card', card_checkbox.checked);
    }

    function handleExpenseAction(action, expenseId, target) {
        switch (action) {
            case 'delete':
                renderDeletePrompt(expenseId).then(() => {})
                break;
            case 'edit':
                if (target) target.setAttribute("disabled", "");
                renderEditPrompt(expenseId).then(() => {if (target) target.removeAttribute("disabled")})
                break;
            case 'attachments':
                if (target) target.setAttribute("disabled", "");
                openUploadModal(expenseId, null).then(() => {if (target) target.removeAttribute("disabled")});
                break;
            default:
                console.error("Event delegation encountered unknown action: ", action);
        }
    }

    async function renderEditPrompt(expenseId) {
        let fetchExpenseResponse;
        try {
            fetchExpenseResponse = await fetch('/api/expenses/' + expenseId, {
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

    async function renderDeletePrompt(expenseId) {
        const card = document.getElementById(`expense-${expenseId}`);
        const promptOverlay = document.createElement("div")
        promptOverlay.className = "overlay";

        const promptOverlayContent = document.createElement("div")
        promptOverlayContent.className = "content";

        const promptOverlayText = document.createElement("p");
        promptOverlayText.innerText = "Are you sure you want to delete this expense?";

        const promptOverlayActions = document.createElement("div");
        promptOverlayActions.className = "action";

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-danger";
        deleteBtn.innerHTML = "<i class='bi bi-trash3-fill'></i> Delete"

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn btn-secondary";
        cancelBtn.innerText = "Cancel";

        deleteBtn.addEventListener("click", async function() {
            try {
                const deleteResult = await fetch(`/api/expenses/${expenseId}/delete`, {
                    method: "POST",
                    headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                    signal: AbortSignal.timeout(5000),
                    credentials: 'same-origin'
                })
                if (deleteResult.ok) {
                    promptOverlay.remove();
                    pushToast("Expense has been deleted.", "Success", "success");
                    window.location.reload();
                } else {
                    let error_message = "An error occured while deleting this expense."
                    try {
                        const jsonError = await deleteResult.json();
                        if (jsonError.error_message) {
                            error_message = `This expense can't be deleted: ${jsonError.error_message}`;
                        }
                    } catch {}
                    pushToast(error_message, "Error", "danger");
                }
            } catch (e) {
                console.error(e);
                pushToast("An error occured while deleting this expense.", "Error", "danger");
            }

        })

        cancelBtn.addEventListener("click", function() {
            promptOverlay.remove();
        });

        promptOverlayActions.appendChild(deleteBtn);
        promptOverlayActions.appendChild(cancelBtn);

        promptOverlayContent.appendChild(promptOverlayText);
        promptOverlayContent.appendChild(promptOverlayActions);

        promptOverlay.appendChild(promptOverlayContent);

        card.querySelector(".expense-card-contents").appendChild(promptOverlay);
    }

    const filesInUpload = [];

    const uploadModal = new bootstrap.Modal(document.getElementById("manageExpenseAttachmentsModal"));
    const createExpenseModalElement = document.getElementById("createExpenseModal");
    const createExpenseModal = new bootstrap.Modal(createExpenseModalElement);

    createExpenseModalElement.addEventListener("hidden.bs.modal", () => {
        resetExpenseForm();
    })

    createExpenseModalElement.addEventListener("show.bs.modal", () => {
        const spentDtInput = document.getElementById("spent_dt");
        if (!spentDtInput.value) {
            const now_dt = new Date();
            spentDtInput.value = new Date(now_dt.getTime() - (now_dt.getTimezoneOffset() * 60 * 1000)).toISOString().slice(0, 16);
        }
    })

    const fileDisplay = document.getElementById("expense-attachments-display");

    let currentExpenseId = 0;

    async function openUploadModal(expenseId, expense_data = null) {
        currentExpenseId = expenseId;
        if (!expense_data) {
            let fetchExpenseResponse;
            try {
                fetchExpenseResponse = await fetch('/api/expenses/' + expenseId, {
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
        }

        fileDisplay.innerHTML = '';
        // populate the description of the expense at the top of the manageExpenseAttachmentsModal
        let expenseDetails = [];
        if (expense_data) {
            if (expense_data.category) {
                expenseDetails.push(expense_data.category.name);
            }
            if (expense_data.description) {
                expenseDetails.push(expense_data.description);
            }
            let currency_disp = formatMoney(expense_data.amount);
            expenseDetails.push(currency_disp);
            document.getElementById("manageExpenseAttachmentsExpenseDetails").innerText = expenseDetails.join(" \u00B7 ");
            uploadModal.show();
            await initFileUploader();
        } else {
            console.error("Failed to read expense data: ", e);
            pushToast("Could not fetch details about this expense due to an error.", "Couldn't manage attachments", "danger");
        }
    }

    const expenseForm = document.getElementById("expense-form");



    function resetExpenseForm() {
        expenseForm.reset();
        expenseForm.removeAttribute("data-expenseid");
        expenseForm.removeAttribute("data-purpose");
    }

    resetExpenseForm();

    expenseForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        function completeError(error_message) {
            createExpenseAlert.innerHTML = error_message;
            createExpenseAlert.style.display = "block";
        }

        let formDataJson;

        const createExpenseAlert = document.getElementById("createExpenseAlert");
        createExpenseAlert.innerHTML = "";
        createExpenseAlert.style.display = "none";

        try {
            formDataJson = formToJSObject(expenseForm);
            formDataJson.spent_dt = new Date(document.getElementById("spent_dt").value).toISOString();
        } catch (e) {
            makeFormSubmitButtonUnload(expenseForm);
            completeError("An error occured while trying to send your expense. Please try again later.");
            return console.error("Failed to create form data for sending: ", e)
        }

        if (expenseForm.dataset.purpose === 'edit') {
            const editExpenseId = expenseForm.dataset.expenseid;
            const actualEditExpenseId = parseInt(editExpenseId, 10);
            if (isNaN(actualEditExpenseId)) {
                makeFormSubmitButtonUnload(expenseForm);
                return completeError(`Hmm... Something's not right. Please reload this page before editing this expense again.`);

            } else {
                let editExpenseResponse;
                try {
                    editExpenseResponse = await fetch(`/api/expenses/${editExpenseId}/edit`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                        signal: AbortSignal.timeout(5000),
                        body: JSON.stringify(formDataJson),
                        credentials: 'same-origin'
                    })
                } catch (e) {
                    makeFormSubmitButtonUnload(expenseForm);
                    console.error("Failed to send edit expense data: ", e);
                    return completeError(`I couldn't edit this expense: ${e.toString()}`);
                }
                makeFormSubmitButtonUnload(expenseForm);
                let jsonResponse;
                try {
                    jsonResponse = await editExpenseResponse.json();
                } catch (e) {
                    return completeError("Hmm... Something isn't right. Reload this page and check if the expense is edited.")
                }
                if (editExpenseResponse.ok) {
                    const existingCardElement = document.getElementById(jsonResponse.html.id);
                    if (existingCardElement) {
                        existingCardElement.outerHTML = jsonResponse.html.render
                    } else {
                        const expensesSection = document.getElementById("expenses-section");
                        expensesSection.insertAdjacentHTML('afterbegin', jsonResponse.html.render);
                    }
                } else {
                    completeError(jsonResponse?.error_message || "An unknown error occured.");
                    return createExpenseAlert.style.display = "block";
                }
            }
            resetExpenseForm();
            createExpenseModal.hide();

        } else {
            try {
                let createExpenseResponse;

                try {
                    createExpenseResponse = await fetch('/api/expenses/new', {
                        method: 'post',
                        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                        signal: AbortSignal.timeout(5000),
                        body: JSON.stringify(formDataJson),
                        credentials: 'same-origin'
                    })
                } catch (e) {
                    console.error("Failed to send new expense data: ", e);
                    return completeError(`I couldn't create this new expense: ${e.toString()}`)
                }

                makeFormSubmitButtonUnload(expenseForm);
                let jsonResponse;
                try {
                    jsonResponse = await createExpenseResponse.json();
                } catch (e) {
                    return completeError("Hmm... Something isn't right. Reload this page and check if the expense is created.")
                }
                if (createExpenseResponse.status !== 201) {
                    completeError(jsonResponse?.error_message || "An unknown error occured.");
                    createExpenseAlert.style.display = "block";
                } else {
                    if (jsonResponse) {
                        try {
                            const unclaimedAmt = document.getElementById("unclaimed-amt")
                            const newPendingAmount = currency(unclaimedAmt.dataset.money).add(jsonResponse.expense.amount)
                            console.log(newPendingAmount);
                            unclaimedAmt.setAttribute("data-money", newPendingAmount.format({
                                separator: '',
                                symbol: ''
                            }));
                            unclaimedAmt.innerText = newPendingAmount.format();
                        } catch (e) {
                            console.error("Unable to update Unclaimed amt:", e)
                        }
                        try {
                            document.querySelector(".no-claims").style.display = "none";
                            const existingCardElement = document.getElementById(jsonResponse.html.id);
                            if (existingCardElement) {
                                existingCardElement.outerHTML = jsonResponse.html.render
                            } else {
                                const expensesSection = document.getElementById("expenses-section");
                                expensesSection.insertAdjacentHTML('afterbegin', jsonResponse.html.render);
                            }
                        } catch (e) {
                            console.log("Unable to add new expense card:", e);
                        }
                        resetExpenseForm();
                        createExpenseModal.hide();
                        await openUploadModal(jsonResponse.expense.id, jsonResponse.expense);
                    } else {
                        createExpenseModal.hide();
                        location.reload();
                    }
                }
            } catch (e) {
                console.error(e);
                completeError("An error occured while trying to send your expense. Please try again.");
            }
        }
    })
    class FileItem {
        constructor(file, actualMimeType, container) {
            this.file = file;
            this.mimeType = actualMimeType;
            this.container = container;
            this.element = this.createFileItem();
            this.container.appendChild(this.element);
            this.isUploadSuccess = false;
        }

        createFileItem() {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.dataset.mimeType = this.mimeType;

            const fileDetails = document.createElement('div');
            fileDetails.className = 'file-details';

            const fileLink = document.createElement('a');
            fileLink.className = "text-decoration-none";
            fileLink.href = "javascript:void(0);";

            const fileIcon = document.createElement('i');
            fileIcon.className = 'bi bi-file-earmark file-icon';

            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';

            const fileNameElement = document.createElement('p');
            fileNameElement.className = 'file-name';
            fileNameElement.textContent = this.file.name;

            const fileSizeElement = document.createElement('p');
            fileSizeElement.className = 'file-size';
            fileSizeElement.textContent = `${(this.file.size / 1024 / 1024).toFixed(2)} MB`;

            const fileActionMessage = document.createElement('div');
            fileActionMessage.className = 'file-action-message';

            fileInfo.appendChild(fileNameElement);
            fileInfo.appendChild(fileSizeElement);
            fileInfo.appendChild(fileActionMessage);

            fileDetails.appendChild(fileIcon);
            fileDetails.appendChild(fileInfo);

            fileLink.appendChild(fileDetails);

            const removeButton = document.createElement('button');
            removeButton.className = 'btn-close';
            removeButton.type = 'button';
            removeButton.setAttribute('aria-label', 'Remove file');
            removeButton.style.display = 'none'; // Initially hide the remove button

            // Set up the initial click handler for the remove button to just remove the element
            removeButton.addEventListener('click', () => {
                if (!this.isUploadSuccess) {
                    this.remove();
                }
            });

            // Create progress bar container and progress bar
            const progressBarContainer = document.createElement('div');
            progressBarContainer.className = 'progress progress-bar-container';

            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.role = 'progressbar';
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', '0');
            progressBar.setAttribute('aria-valuemin', '0');
            progressBar.setAttribute('aria-valuemax', '100');

            progressBarContainer.appendChild(progressBar);

            // Append file details, progress bar, and remove button to the main file item container
            fileItem.appendChild(fileLink);
            fileInfo.appendChild(progressBarContainer);
            fileItem.appendChild(removeButton);

            // Store references for later manipulation
            this.progressBar = progressBar;
            this.removeButton = removeButton;
            this.progressBarContainer = progressBarContainer;
            this.fileItem = fileItem;
            this.fileInfo = fileInfo;
            this.fileLink = fileLink;
            this.fileActionMessage = fileActionMessage;

            return fileItem;
        }

        updateProgress(progress) {
            this.progressBar.style.width = `${progress}%`;
            this.progressBar.setAttribute('aria-valuenow', progress);
        }

        async completeSuccess(fileUrl, deleteUrl) {
            this.isUploadSuccess = true;
            // Hide the progress bar
            // this.progressBarContainer.style.display = 'none';
            this.progressBarContainer.remove();

            // Show the remove button
            this.removeButton.style.display = 'block';

            this.fileLink.href = fileUrl;

            // Set up the remove button to handle deletion
            this.removeButton.onclick = async () => {
                try {
                    const response = await fetch(deleteUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
                    if (response.status === 200) {
                        this.fileItem.textContent = 'Attachment deleted.';
                    } else {
                        this.completeError('Failed to delete attachment.', true);
                    }
                } catch (error) {
                    this.completeError('Failed to delete attachment.', true);
                }
            };
        }

        completeError(message, isFromUpload = false) {
            // Hide the progress bar
            // this.progressBarContainer.remove();
            this.progressBarContainer.style.display = 'none';

            // Show the remove button
            this.removeButton.style.display = 'block';

            // Display the error message
            this.fileActionMessage.classList.add("text-danger");
            this.fileActionMessage.textContent = message;

            // If the error is not from an upload, set up the remove button to just remove the element
            if (!isFromUpload) {
                this.removeButton.onclick = () => {
                    this.remove();
                };
            }
        }

        remove() {
            this.element.remove();
        }
    }


    const uploadArea = document.getElementById('expense-attachment-upload');

    const fileInput = document.getElementById('expense-attachment-file-input')

    async function initFileUploader() {
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        })

        uploadArea.addEventListener('dragover', (event) => {
            event.preventDefault(); // To prevent file from benig opened in a new tab I presume
            uploadArea.classList.add('dragover');
        })

        uploadArea.addEventListener('drop', async (event) => {
            event.preventDefault();
            uploadArea.classList.remove('dragover');
            await handleFiles(event.dataTransfer.files);
        })

        fileInput.addEventListener('change', async () => {
            await handleFiles(fileInput.files);
        })
    }

    async function handleFiles(files) {
        console.log(files.length);

        for (let file of files) {
            const actualMimeType = await loadMime(file);
            console.log(actualMimeType);

            const fileItem = new FileItem(file, actualMimeType, fileDisplay);


            filesInUpload.push(file);

            // Example conditional rendering
            if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(actualMimeType)) {
                return fileItem.completeError('Only JPGs, PNGs and PDFs are supported.');
            } else if (file.size > 8000000) {
                return fileItem.completeError('Attachments must be smaller than 8 MB.');
            } else {
                console.log(`Here, the file will be uploaded as part of claim ${currentExpenseId}`)
                let progress = 0;
                const interval = setInterval(() => {
                    if (progress < 100) {
                        progress += 10;
                        fileItem.updateProgress(progress);
                    } else {
                        clearInterval(interval);
                        fileItem.completeSuccess("https://media.nogra.app/download", "/api/attachments/delete")
                    }
                }, 500); // Update progress every 500ms
            }

            console.log(file)
        }
    }
})