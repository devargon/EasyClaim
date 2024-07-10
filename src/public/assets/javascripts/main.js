function makeButtonLoad (button) {
    button.setAttribute("disabled", "");
    const spinner = button.querySelector(".spinner-border");
    spinner.style.display = "inline-block";
}

function makeButtonUnload (button) {
    button.removeAttribute("disabled");
    const spinner = button.querySelector(".spinner-border");
    spinner.style.display = "none";
}

// document.querySelectorAll(".spinner-on-click").forEach(button => {
//     button.addEventListener("click", () => {
//         makeButtonLoad(button);
//     });
// });

if (document.forms.length > 0) {
    for (var i = 0; i < document.forms.length; i++) {
        const form = document.forms[i];
        console.log(form)
        form.addEventListener("submit", () => {
            const submitBtn = form.querySelector(`button[type="submit"]`);
            const buttonSpinner = submitBtn.querySelector(".spinner-border");
            if (buttonSpinner) {
                makeButtonLoad(submitBtn);
            } else {
                console.log("The submit button in this form doesn't have a spinner.")
            }
        })
    }
}