function iv(element) {
    return new Viewer(element, {
        url: 'src',
        toolbar: {
            zoomIn: 1,
            zoomOut: 1,
            reset: 1,
            prev: 0,
            next: 0,
            rotateLeft: 1,
            rotateRight: 1
        },
        filter: function (image) {
            return !image.classList.contains('exclude-viewer')
        }
    });
}

function makeButtonLoad (button) {
    button.setAttribute("disabled", "");
    const spinner = getSpinnerInButton(button);
    if (spinner) {
        spinner.style.display = "inline-block";
    }
}

function makeButtonUnload (button) {
    button.removeAttribute("disabled");
    const spinner = getSpinnerInButton(button);
    if (spinner) {
        spinner.style.display = "none";
    }
}

function getSpinnerInButton(button) {
    return button.querySelector(".spinner-border");
}

function findSubmitButtonInForm(form) {
    return form.querySelector(`button[type="submit"]`);
}

function makeFormSubmitButtonUnload(form) {
    const btn = findSubmitButtonInForm(form);
    makeButtonUnload(btn);
}

if (document.forms.length > 0) {
    for (var i = 0; i < document.forms.length; i++) {
        const form = document.forms[i];
        console.log(form)
        form.addEventListener("submit", () => {
            const submitBtn = findSubmitButtonInForm(form);
            const buttonSpinner = getSpinnerInButton(submitBtn)
            if (buttonSpinner) {
                makeButtonLoad(submitBtn);
            } else {
                console.log("The submit button in this form doesn't have a spinner.");
            }
        })
    }
}

function formToJSObject(form) {
    const data = new FormData(form);

    let object = {};
    data.forEach((value, key) => {
        // Reflect.has in favor of: object.hasOwnProperty(key)
        if(!Reflect.has(object, key)){
            object[key] = value;
            return;
        }
        if(!Array.isArray(object[key])){
            object[key] = [object[key]];
        }
        object[key].push(value);
    });
    return object;
}

function generateExpenseDivForClaimModal(expenses, expensesContainer) {
    expenses.forEach(expense => {

        let entryNameArr = [];
        if (expense.date) {
            const formattedDate = formatISOToLocaleDate(new Date(expense.date))
            if (formattedDate) {
                entryNameArr.push(formattedDate);
            }

        }
        if (expense.description) entryNameArr.push(expense.description);

        const claimExpenseEntryDiv = document.createElement("div")
        claimExpenseEntryDiv.className = "claim-expense-item";
        const claimExpenseEntryNameContainerDiv = document.createElement("div");
        claimExpenseEntryNameContainerDiv.className = "claim-expense-properties";
        const claimExpenseCategoryDiv = document.createElement("div");
        claimExpenseCategoryDiv.className = "claim-expense-category";
        claimExpenseCategoryDiv.innerText = expense.category.name;
        claimExpenseEntryNameContainerDiv.appendChild(claimExpenseCategoryDiv);
        if (entryNameArr.length > 0) {
            const claimExpenseDescriptionDiv = document.createElement("div");
            claimExpenseDescriptionDiv.innerText = entryNameArr.join(' \267 ');
            claimExpenseDescriptionDiv.className = "claim-expense-description";
            claimExpenseEntryNameContainerDiv.appendChild(claimExpenseDescriptionDiv);
        }

        const claimExpenseEntryAmtContainer = document.createElement("div");
        claimExpenseEntryAmtContainer.className = "claim-expense-amount";
        console.log(typeof(expense.amount));
        if (typeof expense.amount === "number" || typeof expense.amount === "string") expense.amount = currency(expense.amount);
        claimExpenseEntryAmtContainer.innerText = expense.amount.format();
        claimExpenseEntryDiv.appendChild(claimExpenseEntryNameContainerDiv);
        claimExpenseEntryDiv.appendChild(claimExpenseEntryAmtContainer);
        expensesContainer.appendChild(claimExpenseEntryDiv);
    })
}

function formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function getAllExpenseCardElements() {
    const el = document.querySelectorAll('[id^="expense-"]');
    const exEl = Array.from(el).filter(ele => /^\bexpense-\d+\b$/.test(ele.id))
    return exEl;
}

function pdfModal(filename, fileURL, modalContainerSelector) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'dynamicModal';
    modal.tabIndex = -1;
    modal.setAttribute('aria-labelledby', 'dynamicModalLabel');
    modal.setAttribute('aria-hidden', 'true');

    const modalDialog = document.createElement('div');
    modalDialog.className = 'modal-dialog modal-lg';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';

    const modalTitle = document.createElement('h5');
    modalTitle.className = 'modal-title';
    modalTitle.id = 'dynamicModalLabel';
    modalTitle.textContent = filename;

    const downloadButton = document.createElement('a');
    downloadButton.href = fileURL;
    downloadButton.download = filename;
    downloadButton.className = 'btn-download';
    downloadButton.target = "_blank";
    downloadButton.setAttribute('aria-label', 'Download');
    downloadButton.innerHTML = '<i class="bi bi-cloud-arrow-down" style="font-size: 1.25rem"></i>';

    const modalCloseButton = document.createElement('button');
    modalCloseButton.type = 'button';
    modalCloseButton.className = 'btn-close';
    modalCloseButton.setAttribute('data-bs-dismiss', 'modal');
    modalCloseButton.setAttribute('aria-label', 'Close');

    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';

    const pdfViewer = document.createElement('iframe');
    pdfViewer.src = fileURL;
    pdfViewer.className = "iframeInModal";

    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn btn-secondary';
    closeButton.setAttribute('data-bs-dismiss', 'modal');
    closeButton.textContent = 'Close';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'btn btn-primary';
    saveButton.textContent = 'Save changes';

    // Append elements
    modalBody.appendChild(pdfViewer);
    modalFooter.appendChild(closeButton);
    modalFooter.appendChild(saveButton);
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(downloadButton);
    modalHeader.appendChild(modalCloseButton);
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modalDialog.appendChild(modalContent);
    modal.appendChild(modalDialog);
    document.querySelector(modalContainerSelector).appendChild(modal);

    // Initialize and show the modal
    const myModal = new bootstrap.Modal(modal, {
        keyboard: false
    });

    myModal.show();

    // Add event listener to destroy modal on close
    modal.addEventListener('hidden.bs.modal', function () {
        modal.remove();
    });
}