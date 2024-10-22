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

/**
 * Checks if the provided bytes match the given pattern according to the specified mask.
 * @param {Uint8Array} bytes - The array of bytes to check.
 * @param {number[]} pattern - The pattern to compare against.
 * @param {number[]} mask - The mask used for the comparison.
 * @returns {boolean} - Returns true if the bytes match the pattern based on the mask, otherwise false.
 */
const checkMime = (bytes: Uint8Array, pattern: number[], mask: number[]): boolean => {
    return pattern.every((p, i) => (bytes[i] & mask[i]) === p);
};

// const readFileAsArrayBuffer = (blob) =>
//     new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onloadend = () => {
//             if (reader.readyState === FileReader.DONE) {
//                 resolve(new Uint8Array(reader.result));
//             }
//         };
//         reader.onerror = reject;
//         reader.readAsArrayBuffer(blob);
//     });

export const loadMime = async (file: Buffer) => {
    const bytes = new Uint8Array(file.buffer, file.byteOffset, 8);

    const mime = mimes.find((m) => checkMime(bytes, m.pattern, m.mask));

    return mime ? mime.mime : 'unknown';
};