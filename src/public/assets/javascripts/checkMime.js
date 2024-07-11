const mimes = [
    {
        mime: 'image/jpeg',
        pattern: [0xFF, 0xD8, 0xFF],
        mask: [0xFF, 0xFF, 0xFF],
    },
    {
        mime: 'image/png',
        pattern: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
        mask: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
    },
    {
        mime: 'application/pdf',
        pattern: [0x25, 0x50, 0x44, 0x46, 0x2D],
        mask: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
    },
    // Add more MIME types as needed
];

const checkMime = (bytes, { pattern, mask }) =>
    pattern.every((p, i) => (bytes[i] & mask[i]) === p);

const readFileAsArrayBuffer = (blob) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (reader.readyState === FileReader.DONE) {
                resolve(new Uint8Array(reader.result));
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });

const loadMime = async (file) => {
    const blob = file.slice(0, 8); // Read the first 8 bytes of the file
    const bytes = await readFileAsArrayBuffer(blob);

    const mime = mimes.find((m) => checkMime(bytes, m));
    return mime ? mime.mime : 'unknown';
};