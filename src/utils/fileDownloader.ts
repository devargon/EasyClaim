export async function downloadFileAsBuffer(url: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        return Buffer.from(new Uint8Array(await response.arrayBuffer()));
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}