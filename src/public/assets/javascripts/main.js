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

function formToJSON(form) {
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
    return JSON.stringify(object);
}