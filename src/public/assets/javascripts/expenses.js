const app = Vue.createApp({
    data() {
        return {
            currentStep: 2
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
    class FileItem {
        constructor(file, actualMimeType, container) {
            this.file = file;
            this.mimeType = actualMimeType;
            this.container = container;
            this.element = this.createFileItem();
            this.container.appendChild(this.element);
            this.isUploadSuccess = false; // Flag to track if upload was successful
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

            const fileNameElement = document.createElement('p');
            fileNameElement.className = 'file-name';
            fileNameElement.textContent = this.file.name;

            const fileSizeElement = document.createElement('p');
            fileSizeElement.className = 'file-size';
            fileSizeElement.textContent = `${(this.file.size / 1024 / 1024).toFixed(2)} MB`;

            fileInfo.appendChild(fileNameElement);
            fileInfo.appendChild(fileSizeElement);

            fileDetails.appendChild(fileIcon);
            fileDetails.appendChild(fileInfo);

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
            fileItem.appendChild(fileDetails);
            fileInfo.appendChild(progressBarContainer);
            fileItem.appendChild(removeButton);

            // Store references for later manipulation
            this.progressBar = progressBar;
            this.removeButton = removeButton;
            this.progressBarContainer = progressBarContainer;
            this.fileItem = fileItem;
            this.fileInfo = fileInfo;

            return fileItem;
        }

        updateProgress(progress) {
            this.progressBar.style.width = `${progress}%`;
            this.progressBar.setAttribute('aria-valuenow', progress);
        }

        async completeSuccess(deleteUrl) {
            this.isUploadSuccess = true;
            // Hide the progress bar
            // this.progressBarContainer.style.display = 'none';
            this.progressBarContainer.remove();

            // Show the remove button
            this.removeButton.style.display = 'block';

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
            const messageElement = document.createElement('p');
            messageElement.className = 'file-item-error';
            messageElement.textContent = message;
            this.fileInfo.appendChild(messageElement);

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


    const expenseForm  = document.getElementById('expense-form');

    const uploadArea = document.getElementById('expense-attachment-upload');

    const fileInput = document.getElementById('expense-attachment-file-input')

    const fileDisplay = document.getElementById("expense-attachments-display")

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

    async function handleFiles(files) {
        console.log(files.length);
        for (let file of files) {
            const actualMimeType = await loadMime(file);
            console.log(actualMimeType);
            const stringFileSize = `${(file.size / 1024 / 1024).toFixed(2)} MB`;

            const fileItem = new FileItem(file, actualMimeType, fileDisplay);

            // Example conditional rendering
            if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(actualMimeType)) {
                return fileItem.completeError('Only JPGs, PNGs and PDFs are supported.');
            } else if (file.size > 8000000) {
                return fileItem.completeError('Attachments must be smaller than 8 MB.');
            } else {
                let progress = 0;
                const interval = setInterval(() => {
                    if (progress < 100) {
                        progress += 10;
                        fileItem.updateProgress(progress);
                    } else {
                        clearInterval(interval);
                    }
                }, 500); // Update progress every 500ms
            }

            console.log(file)

            // s = `File: ${file.name}\nMime type ${actualMimetype}`;
            //
            // alert(s);
            // const fileItem = document.createElement('div');
        }
    }
})