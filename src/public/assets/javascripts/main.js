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

const fileSizeElement = document.createElement('p');
fileSizeElement.className = 'file-size';
fileSizeElement.textContent = formatFileSize(this.file.size);
