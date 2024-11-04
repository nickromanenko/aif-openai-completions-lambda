export function splitTextIntoChunks(
    text: string,
    chunkSize: number = 1000, // Default chunk size is 5000 characters
    overlap: number = 100, // Overlap size between chunks
): string[] {
    // Array to store the resulting chunks
    const chunks: string[] = [];
    // Current position to start slicing
    let currentPosition = 0;

    // Continue splitting until the end of the text is reached
    while (currentPosition < text.length) {
        // Calculate the end position for the current chunk
        const endPosition = Math.min(currentPosition + chunkSize, text.length);
        // Slice the text for the current chunk
        const chunk = text.slice(currentPosition, endPosition);
        // Push the chunk to the array
        chunks.push(chunk);
        // Update the current position with overlap
        currentPosition += chunkSize - overlap;
    }

    return chunks;
}
