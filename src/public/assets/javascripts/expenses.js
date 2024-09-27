const app = Vue.createApp({
    data() {
        return {
            selectedExpenses: [],
            offset: 0.00,
            showingCompletedExpenses: false
        }
    },
    methods: {}
});



const vm = app.mount('#app');

document.addEventListener('DOMContentLoaded', function () {
    const viewerInstances = {};
    const selectedExpenses = [];
    let currentSelectedExpensesForClaim = [];
    let uploadedFiles = [];
    let pendingFiles = [];
    let currentExpenseId = 0;

    const uploadModalElement = document.getElementById("manageExpenseAttachmentsModal")
    const uploadModal = new bootstrap.Modal(uploadModalElement);

    function initializeExpenseCardAttachments(expenseCard) {
        if (viewerInstances[expenseCard.id]) {
            viewerInstances[expenseCard.id].destroy();
        }
        if (expenseCard.querySelectorAll("img").length > 0) {
            expenseCard.querySelectorAll(".ex-image-dl").forEach(image_download => {
                image_download.outerHTML = image_download.innerHTML;
                // if javascript is enabled replace link with image viewer
            })
            viewerInstances[expenseCard.id] = iv(expenseCard);
        }
        expenseCard.querySelectorAll(".ex-pdf_dl").forEach((pdfAttachment) => {

            pdfAttachment.firstChild.addEventListener("click", function (event) {
                event.preventDefault();
                pdfModal(pdfAttachment.dataset.filename, pdfAttachment.href, ".expense-modal-container");
            })
            // pdfAttachment.href = "";
        })
    }

    // Helper Functions
    function handleCheckbox(event) {
        const checkbox = event.target;
        const expenseId = checkbox.value;

        if (checkbox.checked) {
            if (!selectedExpenses.includes(expenseId)) {
                selectedExpenses.push(expenseId);
            }
        } else {
            const index = selectedExpenses.indexOf(expenseId);
            if (index > -1) {
                selectedExpenses.splice(index, 1);
            }
        }

        console.log('Selected Expenses:', selectedExpenses);
        if (selectedExpenses.length > 0) {
            createClaimButton.removeAttribute("disabled");
        } else {
            createClaimButton.setAttribute("disabled", "");
        }
    }

    function updateExpenseCardAndImageViewer(element_id, render) {
        const ele = document.getElementById(element_id);
        if (ele) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(render, 'text/html');
            ele.querySelector('.expense-card-selectable-contents').innerHTML = doc.querySelector('.expense-card-selectable-contents').innerHTML
        } else {
            const expensesSection = document.getElementById("expenses-section");
            expensesSection.insertAdjacentHTML('afterbegin', render);
            document.getElementById(element_id).querySelector('input[name="select-expense"]').addEventListener('change', handleCheckbox);
        }
        const updatedEle = document.getElementById(element_id);
        initializeExpenseCardAttachments(updatedEle);
    }

    function getAllExpenseCardElements() {
        const el = document.querySelectorAll('[id^="expense-"]');
        const exEl = Array.from(el).filter(ele => /^\bexpense-\d+\b$/.test(ele.id))
        return exEl;
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

    function pushToast(message, header, type) {
        let color = type ? `text-bg-${type} border-0` : "";
        const toastElement = document.createElement("div");
        toastElement.className = `toast ${color}`;
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
            const headerElement = document.createElement("strong");
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

        const toast = new bootstrap.Toast(toastElement, {autohide: true, delay: 4000});
        toast.show();

        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    function formatMoney(money) {
        let currency_disp;
        try {
            currency_disp = currency(money).format();
        } catch {
            currency_disp = "$" + Number(money).toFixed(2);
        }
        return currency_disp;
    }

    function handleCardTouch(target) {
        const card_checkbox = target.querySelector('input[type="checkbox"]');
        if (card_checkbox) {
            card_checkbox.click();
            target.classList.toggle('selected-card', card_checkbox.checked);
        }
    }

    function handleExpenseAction(action, expenseId, target) {
        switch (action) {
            case 'delete':
                renderDeletePrompt(expenseId).then(() => {});
                break;
            case 'edit':
                if (target) target.setAttribute("disabled", "");
                renderEditPrompt(expenseId).then(() => {
                    if (target) target.removeAttribute("disabled");
                });
                break;
            case 'attachments':
                if (target) target.setAttribute("disabled", "");
                openUploadModal(expenseId, null).then(() => {
                    if (target) target.removeAttribute("disabled");
                });
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
            });
        } catch (e) {
            console.error("Failed to read expense data: ", e);
            pushToast("I couldn't fetch details about this expense due to an error.", "Couldn't manage attachments", "danger");
            return;
        }

        let jsonResponse;
        try {
            jsonResponse = await fetchExpenseResponse.json();
        } catch (e) {
            console.error("Failed to read expense data: ", e);
            pushToast("Could not fetch details about this expense due to an error.", "Couldn't manage attachments", "danger");
            return;
        }

        if (fetchExpenseResponse.status !== 200) {
            console.error("Unexpected status code received: ", fetchExpenseResponse.status);
            pushToast(jsonResponse?.error_message || "An unknown error occurred.", "Couldn't manage attachments", "danger");
        } else {
            const expense_data = jsonResponse;

            if (expense_data) {
                expenseForm.setAttribute("data-expenseid", expense_data.id);
                expenseForm.setAttribute("data-purpose", "edit");

                document.getElementById("expense_amt").value = currency(expense_data.amount).format({
                    separator: '',
                    symbol: ''
                });
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
    }

    async function renderDeletePrompt(expenseId) {
        const card = document.getElementById(`expense-${expenseId}`);
        const promptOverlay = document.createElement("div");
        promptOverlay.className = "overlay";

        const promptOverlayContent = document.createElement("div");
        promptOverlayContent.className = "content";

        const promptOverlayText = document.createElement("p");
        promptOverlayText.innerText = "Are you sure you want to delete this expense?";

        const promptOverlayActions = document.createElement("div");
        promptOverlayActions.className = "action";

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-danger";
        deleteBtn.innerHTML = "<i class='bi bi-trash3-fill'></i> Delete";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn btn-secondary";
        cancelBtn.innerText = "Cancel";

        deleteBtn.addEventListener("click", async function () {
            try {
                const deleteResult = await fetch(`/api/expenses/${expenseId}/delete`, {
                    method: "POST",
                    headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                    signal: AbortSignal.timeout(5000),
                    credentials: 'same-origin'
                });
                if (deleteResult.ok) {
                    promptOverlay.remove();
                    pushToast("Expense has been deleted.", "Success", "success");
                    window.location.reload();
                } else {
                    let error_message = "An error occurred while deleting this expense.";
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
                pushToast("An error occurred while deleting this expense.", "Error", "danger");
            }
        });

        cancelBtn.addEventListener("click", function () {
            promptOverlay.remove();
        });

        promptOverlayActions.appendChild(deleteBtn);
        promptOverlayActions.appendChild(cancelBtn);

        promptOverlayContent.appendChild(promptOverlayText);
        promptOverlayContent.appendChild(promptOverlayActions);

        promptOverlay.appendChild(promptOverlayContent);

        card.querySelector(".expense-card").appendChild(promptOverlay);
    }

    function openClaimModal(expenseIds) {
        try {
            createClaimModalEntriesSection.innerHTML = "";
            const foundExpenses = [];
            if (expenseIds.length < 1) {
                return pushToast("You need to select at least one expense.", "Error creating claim", "danger");
            }
            let expenseClaimSubtotal = currency(0.00);
            expenseIds.reverse().forEach(expenseId => {
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
                    if (!expenseAmount) {
                        console.error(`Could not find expense amount information for #${expenseId}`);
                    } else if (!(expenseCategoryName || expenseDescription)) {
                        console.error(`Could not find expense cat or desc for ${expenseId}`);
                    } else {
                        const expenseInformalObj = {
                            amount: currency(expenseAmount),
                            date: new Date(expenseDate),
                            category: {
                                name: expenseCategoryName,
                            },
                            description: expenseDescription,
                        };
                        foundExpenses.push(expenseInformalObj);
                        expenseClaimSubtotal = expenseClaimSubtotal.add(expenseInformalObj.amount.value);
                    }
                } else {
                    console.error(`Could not find the Expense Card div for ${expenseId}`);
                }
            });
            if (foundExpenses.length === 0) {
                console.error("Failed to parse any selected expenses.");
                return pushToast("Hmm... Something is wrong. I could not find any expenses. Refresh the page and try again.", "Error creating expenses.", "danger");
            }
            generateExpenseDivForClaimModal(foundExpenses, createClaimModalEntriesSection);

            claimOffsetAmtInput.max = expenseClaimSubtotal.format({separator: '', symbol: ''});

            const offsetAmtDiv = document.querySelector(".offset-amt");
            offsetAmtDiv.innerText = currency(0.00).format();
            const totalAmountDiv = document.querySelector(".claim-total");
            totalAmountDiv.innerText = expenseClaimSubtotal.format();
            totalAmountDiv.setAttribute("data-subtotal", expenseClaimSubtotal.format({separator: '', symbol: ''}));

            currentSelectedExpensesForClaim = expenseIds;
            createClaimModal.show();
        } catch (e) {
            console.error(e);
            return pushToast("An error occurred while trying to generate the claim details.", "Could not create claim", "danger");
        }
    }

    const fileDisplay = document.getElementById("expense-attachments-display");

    async function openUploadModal(expenseId, expense_data = null) {
        uploadedFiles = [];
        pendingFiles = [];
        let fileNumberLimit = 0;
        let fileSizeMaxInBytes = 0;
        currentExpenseId = expenseId;
        if (!expense_data) {
            let fetchExpenseResponse;
            let fileUploadLimitsResponse;
            try {
                fetchExpenseResponse = await fetch('/api/expenses/' + expenseId, {
                    method: 'get',
                    credentials: 'same-origin',
                    signal: AbortSignal.timeout(5000)
                });
                fileUploadLimitsResponse = await fetch("/api/settings/limits/upload")
            } catch (e) {
                console.error("Failed to read server response: ", e);
                pushToast("I couldn't fetch details from the server due to an error.", "Couldn't manage attachments", "danger");
                return;
            }

            let expensesJsonResponse;
            let fileUploadLimitJson;
            try {
                fileUploadLimitJson = await fileUploadLimitsResponse.json();
                expensesJsonResponse = await fetchExpenseResponse.json();
            } catch (e) {
                console.error("Failed to read server response: ", e);
                pushToast("I couldn't fetch details from the server due to an error.", "Couldn't manage attachments", "danger");
                return;
            }

            if (!fileUploadLimitsResponse.ok) {
                console.error("Unexpected status code received: ", fileUploadLimitsResponse.status);
                pushToast(fileUploadLimitJson?.error_message || "An unknown error occurred.", "Couldn't manage attachments", "danger");
            } else {
                fileNumberLimit = fileUploadLimitJson.fileLimit;
                fileSizeMaxInBytes = fileUploadLimitJson.fileSize;
            }
            if (!fetchExpenseResponse.ok) {
                console.error("Unexpected status code received: ", fetchExpenseResponse.status);
                pushToast(expensesJsonResponse?.error_message || "An unknown error occurred.", "Couldn't manage attachments", "danger");
            } else {
                expense_data = expensesJsonResponse;
            }
        }

        fileDisplay.innerHTML = '';
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
            expense_data.attachments.forEach(attachment => {
                let fileItem = new FileItem({name: attachment.fileName, size: attachment.fileSize}, null, fileDisplay);
                fileItem.completeSuccess(attachment.fileUrl, `/api/expenses/${currentExpenseId}/attachments/${attachment.id}/delete`);
            });
            document.querySelector(".file-no-limit-display").innerText = fileNumberLimit;
            document.querySelector(".file-size-limit-display").innerText = formatFileSize(fileSizeMaxInBytes);
            uploadModal.show();
        } else {
            console.error("Failed to read expense data: ", e);
            pushToast("Could not fetch details about this expense due to an error.", "Couldn't manage attachments", "danger");
        }
    }

    function makeUploadModalUnescapable(truefalse) {
        const doneButton = document.querySelector('button.btn.btn-primary[data-bs-dismiss="modal"]');
        if (truefalse) {
            uploadModal._config.keyboard = false;
            uploadModal._config.backdrop = 'static';
            uploadModal.handleUpdate();
            doneButton.setAttribute("disabled", "");
            doneButton.classList.add("disabled");
        } else {
            uploadModal._config.keyboard = true;
            uploadModal._config.backdrop = true;
            doneButton.removeAttribute("disabled");
            doneButton.classList.remove("disabled");
        }
        uploadModal.handleUpdate();
    }

    function resetExpenseForm() {
        expenseForm.reset();
        expenseForm.removeAttribute("data-expenseid");
        expenseForm.removeAttribute("data-purpose");
    }

    async function handleFiles(files) {
        files = Array.from(files);
        fileInput.value = null;

        const promises = files.map(async (file) => {
            try {
                const actualMimeType = await loadMime(file);
                console.log(actualMimeType);
                console.log("Pending Files:");
                console.log(pendingFiles);
                console.log("Uploaded Files");
                console.log(uploadedFiles);

                const fileItem = new FileItem(file, actualMimeType, fileDisplay);
                if ((pendingFiles.length + uploadedFiles.length) >= 3) {
                    return fileItem.completeError("You can only upload a maximum of 3 files. (FE)");
                }
                pendingFiles.push(fileItem);
                makeUploadModalUnescapable(pendingFiles.length > 0);
                if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(actualMimeType)) {
                    return fileItem.completeError('Only JPGs, PNGs and PDFs are supported.');
                }

                let presignResponse;
                try {
                    presignResponse = await axios.post(`/api/expenses/${currentExpenseId}/attachments/upload`, {
                        fileName: file.name,
                        size: file.size,
                        contentType: actualMimeType,
                    });
                } catch (e) {
                    if (e.response && e.response.data && e.response.data.error_message) {
                        return fileItem.completeError(`Failed to upload: ${e.response.data.error_message}`);
                    }
                    console.error("Failed to upload file (1): ", e);
                    return fileItem.completeError(`Failed to upload file, try again later.`);
                }

                let presignedURL;
                if (presignResponse && presignResponse.data && presignResponse.data.upload) {
                    presignedURL = presignResponse.data.upload;
                } else {
                    console.error("Presigned URL missing in response");
                    return fileItem.completeError("Failed to upload file, try again later.");
                }

                let uploadResponse;
                try {
                    uploadResponse = await axios.put(presignedURL, file, {
                        headers: {"Content-Type": actualMimeType},
                        onUploadProgress: (progressEvent) => {
                            console.log(Math.round(progressEvent.loaded / progressEvent.total * 100));
                            const percentCompleted = Math.round((progressEvent.loaded / progressEvent.total * 100));
                            fileItem.updateProgress(percentCompleted);
                        }
                    });
                } catch (e) {
                    let error_msg = `Failed to upload file, try again later.`;
                    console.error("Failed to upload file to provider: ", e);
                    if (e.response && e.response.status) {
                        if (e.response.data && e.response.data.error_message) {
                            error_msg = e.response.data.error_message;
                        } else {
                            error_msg += ` (${e.response.status})`;
                        }
                    }
                    return fileItem.completeError(error_msg);
                }

                if (!(uploadResponse.status >= 200 && uploadResponse.status < 300)) {
                    console.error("Response from uploading to provider, was not 2XX");
                    return fileItem.completeError("Failed to upload file, try again later.");
                }

                let doneAttachmentResponse;
                try {
                    doneAttachmentResponse = await axios.post(`/api/expenses/${currentExpenseId}/attachments`, {
                        fileName: file.name,
                        fileUrl: presignResponse.data.fileUrl,
                        fileSize: file.size,
                        mimeType: actualMimeType
                    });
                    if (doneAttachmentResponse.status === 201 && doneAttachmentResponse.data && doneAttachmentResponse.data.attachment) {
                        if (doneAttachmentResponse.data.html) {
                            try {
                                updateExpenseCardAndImageViewer(doneAttachmentResponse.data.html.id, doneAttachmentResponse.data.html.render);
                            } catch (e) {
                                console.error("Failed to update expense HTML:", e);
                            }
                        }
                        return await fileItem.completeSuccess(doneAttachmentResponse.data.attachment.fileUrl, `/api/expenses/${currentExpenseId}/attachments/${doneAttachmentResponse.data.attachment.id}/delete`);
                    } else {
                        console.error("Response was not expected.", doneAttachmentResponse);
                        return fileItem.completeError("Failed to upload file, try again later.");
                    }
                } catch (e) {
                    let error_msg = `Failed to upload file, try again later.`;
                    console.error("Failed to upload file to provider: ", e);
                    if (e.response && e.response.status) {
                        if (e.response.data && e.response.data.error_message) {
                            error_msg = e.response.data.error_message;
                        } else {
                            error_msg += ` (${e.response.status})`;
                        }
                    }
                    return fileItem.completeError(error_msg);
                }
            } catch (e) {
                console.error(`Error processing file ${file.name}:`, e);
            }
        });

        try {
            await Promise.all(promises);
            console.log("All files processed");
        } catch (error) {
            console.error("Failed to handle promises for uploading files");
        }
    }

    // Event Handlers
    const addExpenseAmountInput = document.getElementById('expense_amt');
    addExpenseAmountInput.addEventListener("input", () => {
        if (handleCurrencyValue(addExpenseAmountInput.value) !== addExpenseAmountInput.value) {
            addExpenseAmountInput.value = handleCurrencyValue(addExpenseAmountInput.value);
        }
    });

    const createClaimModalElement = document.getElementById("createClaimModal");
    const createClaimModal = new bootstrap.Modal(createClaimModalElement);
    const claimOffsetAmtInput = document.getElementById("claim_offset_amt");
    const createClaimModalEntriesSection = document.getElementById("actualClaimExpenseList");
    const createClaimButton = document.getElementById("make-claim");

    createClaimButton.addEventListener("click", function () {
        if (selectedExpenses.length > 0) {
            openClaimModal(selectedExpenses);
        } else {
            pushToast("You need to select at least one expense to make a claim.", "", "warning");
        }
    });

    createClaimModalElement.addEventListener("show.bs.modal", () => {
        claimOffsetAmtInput.value = "";
        return claimOffsetAmtInput.dispatchEvent(new Event("input"));
    });

    claimOffsetAmtInput.addEventListener("input", () => {
        if (handleCurrencyValue(claimOffsetAmtInput.value) !== claimOffsetAmtInput.value) {
            claimOffsetAmtInput.value = handleCurrencyValue(claimOffsetAmtInput.value);
            vm.offset = Number(claimOffsetAmtInput.value);
        }

        let newOffsetNumber = Number(claimOffsetAmtInput.value);
        if (isNaN(newOffsetNumber)) {
            newOffsetNumber = Number(0);
        }
        const claimSubtotalDiv = document.querySelector(".claim-total");
        let subtotal = Number(claimSubtotalDiv.dataset.subtotal);
        if (isNaN(subtotal)) {
            subtotal = Number(0);
        }
        if (newOffsetNumber > subtotal) {
            claimOffsetAmtInput.value = currency(subtotal).format({separator: '', symbol: ''});
            return claimOffsetAmtInput.dispatchEvent(new Event("input"));
        }
        document.querySelector(".offset-amt").innerText = currency(newOffsetNumber).format();
        const claimGrandtotalDiv = document.querySelector(".claim-grandtotal");
        claimGrandtotalDiv.innerText = currency(subtotal).subtract(newOffsetNumber).format();
    });

    const createClaimForm = document.getElementById("createClaimForm");
    createClaimForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        function completeError(error_message) {
            const createClaimAlert = document.getElementById("createClaimAlert");
            createClaimAlert.innerHTML = error_message;
            createClaimAlert.style.display = "block";
        }

        let offsetAmount = Number(claimOffsetAmtInput.value);
        if (isNaN(offsetAmount)) offsetAmount = Number(0);
        if (offsetAmount < 0) {
            makeFormSubmitButtonUnload(createClaimForm);
            return completeError("Your offset amount cannot be lesser than $0.00.");
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
            });
        } catch (e) {
            return res.status(500).json({error_message: `Failed to create claim: ${e.toString()}`});
        } finally {
            makeFormSubmitButtonUnload(createClaimForm);
        }

        if (newClaimResponse.ok) {
            return completeError("OK");
        } else {
            try {
                const json_content = await newClaimResponse.json();
                return completeError(json_content.error_message || "Unable to create a claim. Please try again later.");
            } catch (error) {
                return completeError(`Unable to create a claim. Please try again later.`);
            }
        }
    });

    const createExpenseModalElement = document.getElementById("createExpenseModal");
    const createExpenseModal = new bootstrap.Modal(createExpenseModalElement);
    createExpenseModalElement.addEventListener("hidden.bs.modal", resetExpenseForm);
    createExpenseModalElement.addEventListener("show.bs.modal", () => {
        const spentDtInput = document.getElementById("spent_dt");
        if (!spentDtInput.value) {
            const now_dt = new Date();
            spentDtInput.value = new Date(now_dt.getTime() - (now_dt.getTimezoneOffset() * 60 * 1000)).toISOString().slice(0, 16);
        }
    });

    const expenseForm = document.getElementById("expense-form");
    expenseForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        function completeError(error_message) {
            const createExpenseAlert = document.getElementById("createExpenseAlert");
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
            completeError("An error occurred while trying to send your expense. Please try again later.");
            return console.error("Failed to create form data for sending: ", e);
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
                    });
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
                    return completeError("Hmm... Something isn't right. Reload this page and check if the expense is edited.");
                }
                if (editExpenseResponse.ok) {
                    updateExpenseCardAndImageViewer(jsonResponse.html.id, jsonResponse.html.render);
                } else {
                    completeError(jsonResponse?.error_message || "An unknown error occurred.");
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
                    });
                } catch (e) {
                    console.error("Failed to send new expense data: ", e);
                    return completeError(`I couldn't create this new expense: ${e.toString()}`);
                }

                makeFormSubmitButtonUnload(expenseForm);
                let jsonResponse;
                try {
                    jsonResponse = await createExpenseResponse.json();
                } catch (e) {
                    return completeError("Hmm... Something isn't right. Reload this page and check if the expense is created.");
                }
                if (createExpenseResponse.status !== 201) {
                    completeError(jsonResponse?.error_message || "An unknown error occurred.");
                    createExpenseAlert.style.display = "block";
                } else {
                    if (jsonResponse) {
                        try {
                            const unclaimedAmt = document.getElementById("unclaimed-amt");
                            const newPendingAmount = currency(unclaimedAmt.dataset.money).add(jsonResponse.expense.amount);
                            console.log(newPendingAmount);
                            unclaimedAmt.setAttribute("data-money", newPendingAmount.format({
                                separator: '',
                                symbol: ''
                            }));
                            unclaimedAmt.innerText = newPendingAmount.format();
                        } catch (e) {
                            console.error("Unable to update Unclaimed amt:", e);
                        }
                        try {
                            const no_claims_div = document.querySelector(".no-claims");
                            if (no_claims_div) no_claims_div.style.display = "none";
                            updateExpenseCardAndImageViewer(jsonResponse.html.id, jsonResponse.html.render);
                        } catch (e) {
                            console.error("Unable to add new expense card:", e);
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
                completeError("An error occurred while trying to send your expense. Please try again.");
            }
        }
    });

    const uploadArea = document.getElementById('expense-attachment-upload');
    const fileInput = document.getElementById('expense-attachment-file-input');

    async function initFileUploader() {
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        uploadArea.addEventListener('dragover', (event) => {
            console.log("dragover");
            event.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (event) => {
            console.log("dragleave");
            event.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', async (event) => {
            console.log("drop");
            event.preventDefault();
            uploadArea.classList.remove('dragover');
            console.log(event.dataTransfer);
            await handleFiles(event.dataTransfer.files);
        });

        fileInput.addEventListener('change', async () => {
            await handleFiles(fileInput.files);
        });
    }

    initFileUploader().then();

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

            const fileIcon = document.createElement('i');
            fileIcon.className = 'bi bi-file-earmark file-icon';

            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';

            const fileNameElement = document.createElement('a');
            fileNameElement.className = 'file-name';
            fileNameElement.textContent = this.file.name;
            fileNameElement.href = "";

            const fileSizeElement = document.createElement('p');
            fileSizeElement.className = 'file-size';
            fileSizeElement.textContent = formatFileSize(this.file.size);

            const fileActionMessage = document.createElement('div');
            fileActionMessage.className = 'file-action-message';

            fileInfo.appendChild(fileNameElement);
            fileInfo.appendChild(fileSizeElement);
            fileInfo.appendChild(fileActionMessage);

            fileDetails.appendChild(fileIcon);
            fileDetails.appendChild(fileInfo);

            const removeButton = document.createElement('button');
            removeButton.className = 'btn-close';
            removeButton.type = 'button';
            removeButton.setAttribute('aria-label', 'Remove file');
            removeButton.style.display = 'none';


            removeButton.addEventListener('click', () => {
                if (!this.isUploadSuccess) {
                    this.remove();
                }
            });


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


            fileItem.appendChild(fileDetails);
            fileInfo.appendChild(progressBarContainer);
            fileItem.appendChild(removeButton);

            this.progressBar = progressBar;
            this.removeButton = removeButton;
            this.progressBarContainer = progressBarContainer;
            this.fileItem = fileItem;
            this.fileName = fileNameElement;
            this.fileActionMessage = fileActionMessage;

            return fileItem;
        }

        updateProgress(progress) {
            this.progressBar.style.width = `${progress}%`;
            this.progressBar.setAttribute('aria-valuenow', progress);
        }

        async completeSuccess(fileUrl, deleteUrl) {
            pendingFiles = pendingFiles.filter(e => e !== this);
            uploadedFiles.push(this);
            this.isUploadSuccess = true;
            this.progressBarContainer.remove();
            this.removeButton.style.display = 'block';
            this.fileName.href = fileUrl;
            this.fileName.target = "_blank";
            this.removeButton.onclick = async () => {
                try {
                    const response = await axios.post(deleteUrl, {timeout: 5000});
                    if (response.status === 200) {
                        uploadedFiles = uploadedFiles.filter(e => e !== this);
                        this.fileItem.textContent = 'Attachment deleted.';
                        if (response.data.html) {
                            try {
                                updateExpenseCardAndImageViewer(response.data.html.id, response.data.html.render);
                            } catch (e) {
                                console.error("Failed to update expense HTML:", e);
                            }
                        }
                    } else {
                        this.completeError('Failed to delete attachment.', true);
                    }
                } catch (error) {
                    this.completeError('Failed to delete attachment.', true);
                }
            };
            makeUploadModalUnescapable(pendingFiles.length > 0);
        }

        completeError(message, isFromUpload = false) {
            pendingFiles = pendingFiles.filter(e => e !== this);
            this.progressBarContainer.style.display = 'none';
            this.removeButton.style.display = 'block';
            this.fileActionMessage.classList.add("text-danger");
            this.fileActionMessage.textContent = message;

            if (!isFromUpload) {
                this.removeButton.onclick = () => {
                    this.remove();
                };
            }

            makeUploadModalUnescapable(pendingFiles.length > 0);
        }

        remove() {
            this.element.remove();
        }
    }

    // Event Listener for incomplete expenses
    document.getElementById("incompleteExpenses").addEventListener("click", function (event) {
        let target = event.target;
        if (!target) return;

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
        } else {
            target = target.closest('.expense-card');
            if (target) {
                handleCardTouch(target);
            }
        }
    });

    const expense_cards = getAllExpenseCardElements();

    expense_cards.forEach(expenseCard => {
        initializeExpenseCardAttachments(expenseCard);
        let checkbox = expenseCard.querySelector('input[name="select-expense"]');
        if (checkbox) {
            checkbox.addEventListener('change', handleCheckbox);
        }
    });
});