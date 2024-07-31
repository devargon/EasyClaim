document.addEventListener("DOMContentLoaded", () => {
    const expense_cards = getAllExpenseCardElements();
    expense_cards.forEach(expenseCard => {
        if (expenseCard.querySelectorAll("img").length > 0) {
            expenseCard.querySelectorAll(".ex-image-dl").forEach(image_download => {
                image_download.outerHTML = image_download.innerHTML;
                // if javascript is enabled replace link with image viewer
            })
            iv(expenseCard);
        }
    })
})