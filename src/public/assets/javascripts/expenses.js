const app = Vue.createApp({
    data() {
        return {
            currentStep: 2,
            showingCompletedExpenses: false
        }
    },
    methods: {
        nextStep()  {
            this.currentStep += 1;
        }
    }
});

// Mount the app to the DOM element with id 'app'
app.mount('#app');

document.addEventListener('DOMContentLoaded', function() {

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
        // in case user clicked on <i> icon
        if (target.tagName === 'I' && target.parentElement.classList.contains('action-button')) {
            target = target.parentElement;
        }
        if (target && target.classList.contains('action-button')) {
            console.log("Event has action-button class.");
            event.preventDefault();
            event.stopPropagation();
            const action = target.getAttribute('data-action');
            const expenseId = target.getAttribute('data-expense-id');
            handleExpenseAction(action, expenseId, target);
        }
    });

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
            const deleteResult = await fetch(`/api/expenses/${expenseId}/delete`, {
                method: "POST",
                headers: {'Content-Type': 'application/json'},
                signal: AbortSignal.timeout(5000),
                credentials: 'same-origin'
            })
            if (deleteResult.ok) {
                promptOverlay.remove();
                pushToast("Expense has been deleted.", "Success", "success");
                window.location.reload();
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

    createExpenseModalElement.addEventListener("hidden.bs.modal", event => {
        resetExpenseForm();
    })

    createExpenseModalElement.addEventListener("show.bs.modal", event => {
        const spentDtInput = document.getElementById("spent_dt");
        if (!spentDtInput.value) {
            const now_dt = new Date();
            spentDtInput.value = new Date(now_dt.getTime() - (now_dt.getTimezoneOffset() * 60 * 1000)).toISOString().slice(0, 16);
        }
    })

    const fileDisplay = document.getElementById("expense-attachments-display");

    // populate the datetime field in new expense
    try {
        const expenseDateTimePicker = document.getElementById("spent_dt");
        const now_dt = new Date();
        expenseDateTimePicker.value = new Date(now_dt.getTime() - (now_dt.getTimezoneOffset() * 60 * 1000)).toISOString().slice(0, 16);
    } catch (e) {
        console.error("Could not populate datetime field with default value:", e)
    }

    let currentExpenseId = 0;

    async function openUploadModal(expenseId, expense_data = null) {
        currentExpenseId = expenseId;
        if (!expense_data) {
            let fetchExpenseResponse
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