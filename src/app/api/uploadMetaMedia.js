import { TEMPLATE_MD_UPLOAD, getHeaders1 } from "./Config";

/**
 * Uploads a media file to the backend proxy, which then handles
 * the Meta Resumable Upload to get a valid template handle.
 *
 * @param {File}     file           - The file to upload
 * @param {Function} onProgress     - Optional progress callback (0-100)
 * @returns {Promise<string>}       - The Meta asset handle (h)
 */
export const uploadMetaMedia = async (file, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("isMedia", "1");

    try {
        const response = await fetch(TEMPLATE_MD_UPLOAD(), {
            method: 'POST',
            headers: {
                ...getHeaders1(),
                Accept: 'application/json, text/plain, */*',
            },
            body: formData,
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || response.statusText);
        }

        const data = await response.json();

        const handle = data?.data?.handle?.h || data?.data?.id || data?.payload?.h || data?.id;

        if (!handle) {
            console.error("Backend Response:", data);
            throw new Error(data?.message || "No media handle returned from server.");
        }

        if (onProgress) onProgress(100);
        return handle;

    } catch (err) {
        console.error("Upload Error:", err.message);
        throw new Error(err.message || "Media upload failed");
    }
};