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

    function formatMoney (money) {
        let currency_disp
        try {
            currency_disp = currency(money).format();
        } catch {
            currency_disp = "$" + Number(money).toFixed(2)
        }
        return currency_disp;
    }

    const filesInUpload = [];

    const uploadModal = new bootstrap.Modal(document.getElementById("manageExpenseAttachmentsModal"));

    const createExpenseModal = new bootstrap.Modal(document.getElementById("createExpenseModal"));

    const fileDisplay = document.getElementById("expense-attachments-display");

    const expenseDateTimePicker = document.getElementById("spent_dt");
    const now_dt = new Date();
    expenseDateTimePicker.value = new Date(now_dt.getTime() - (now_dt.getTimezoneOffset() * 60 * 1000)).toISOString().slice(0, 16);

    let currentExpenseId = 0;

    async function openUploadModal(expenseId, expense_data = null) {
        currentExpenseId = expenseId;
        if (!expense_data) {
            // get expense data
            expense_data = {};
        }
        // populate the description of the expense at the top of the manageExpenseAttachmentsModal
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
        }

        document.getElementById("manageExpenseAttachmentsExpenseDetails").innerText = expenseDetails.join(" \u00B7 ");

        uploadModal.show();

        await initFileUploader();
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


        let createExpenseResponse;

        try {
            createExpenseResponse = await fetch('/expenses/api/new', {
                method: 'post',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(formDataJson),
                credentials: 'same-origin'
            })
        } catch (e) {
            console.error("Failed to send new expense data: ", e);
            return completeError(`I couldn't create this new expense: ${e.toString()}`)
        }

        makeFormSubmitButtonUnload(expenseForm);
        const text = await createExpenseResponse.text()
        let jsonResponse;

        try {
            jsonResponse = JSON.parse(text);
        } catch (err) { // not JSON
            jsonResponse = null;
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
                    unclaimedAmt.setAttribute("data-money", newPendingAmount.format({separator: '',symbol: ''}));
                    unclaimedAmt.innerText = newPendingAmount.format();
                } catch (error) {
                    console.error("Unable to update Unclaimed amt:", error)
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
                } catch (error) {
                    console.log("Unable to add new expense card:", error);
                }
                expenseForm.reset();
                createExpenseModal.hide();
                await openUploadModal(1, jsonResponse);
            } else {
                createExpenseModal.hide();
                location.reload();
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
                    const response = await fetch(deleteUrl, { method: 'GET' });
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