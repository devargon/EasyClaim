const formatISOToLocaleDate = (isoDate) => {
    let date;
    if (typeof isoDate === 'string') {
        date = new Date(isoDate);
    } else {
        date = isoDate;
    }
    const userLocale = navigator.language || navigator.userLanguage;
    console.log(userLocale);

    const datePart = date.toLocaleDateString(userLocale, {
        year: '2-digit',
        month: 'long',
        day: 'numeric'
    });
    return datePart
};

document.addEventListener("DOMContentLoaded", () => {
    const formatISOToLocaleDateTime = (isoDate) => {
        const date = new Date(isoDate);
        const userLocale = navigator.language || navigator.userLanguage;
        console.log(userLocale);

        const datePart = date.toLocaleDateString(userLocale, {
            year: '2-digit',
            month: 'long',
            day: 'numeric'
        });
        const timePart = date.toLocaleTimeString(userLocale, {
            hour: 'numeric',
            minute: 'numeric'
        });

        return `${datePart} ${timePart}`;
    };


    const updateElementText = (element) => {
        const isoDate = element.getAttribute('data-iso');
        if (isoDate) {
            element.textContent = formatISOToLocaleDateTime(isoDate);
        }
    };

    const updateAllElements = () => {
        const elements = document.querySelectorAll('[data-iso]');
        elements.forEach(updateElementText);
    };

    updateAllElements();

    // MutationObserver to handle future changes in the DOM
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.hasAttribute('data-iso')) {
                            updateElementText(node);
                        }
                        const descendants = node.querySelectorAll('[data-iso]');
                        descendants.forEach(updateElementText);
                    }
                });
            } else if (mutation.type === 'attributes' && mutation.attributeName === 'data-iso') {
                updateElementText(mutation.target);
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-iso'] });
});
