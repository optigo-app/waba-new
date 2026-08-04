/**
 * Client-side API wrapper for AI flow generation.
 *
 * This calls the local Next.js API route which securely holds the AI API key.
 * The backend uses aiFlowProvider.js to call the actual AI service.
 *
 * Usage (from client components):
 *   import { generateAiFlow, editAiFlow } from '../api/aiFlowApi';
 *   const flow = await generateAiFlow("A jewellery store bot...");
 *   const edited = await editAiFlow(currentFlow, "Add a video node after welcome");
 */

import { getApiUrl } from '../utils/globalFunc';

/**
 * Calls the backend AI flow generation endpoint.
 *
 * @param {string} description - Plain-language bot description
 * @returns {Promise<object>} Generated flow JSON { id, name, nodes, edges, ... }
 * @throws {Error} If the request fails or the AI returns invalid data
 */
export async function generateAiFlow(description) {
    const response = await fetch(getApiUrl('/api/whatsapp/flow/ai-generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
    });

    if (!response.ok) {
        let errMsg;
        try {
            const errData = await response.json();
            errMsg = errData.error || errData.message || `Failed (${response.status})`;
        } catch {
            errMsg = `AI flow generation failed (${response.status})`;
        }
        throw new Error(errMsg);
    }

    const data = await response.json();
    if (!data || !data.nodes) {
        throw new Error('AI flow generation returned invalid data.');
    }

    return data;
}

/**
 * Calls the backend AI flow edit endpoint.
 *
 * @param {object} currentFlow - The current flow { id, name, nodes, edges, ... }
 * @param {string} instruction - Plain-language edit instruction
 * @returns {Promise<object>} Modified flow JSON { id, name, nodes, edges, ... }
 * @throws {Error} If the request fails or the AI returns invalid data
 */
export async function editAiFlow(currentFlow, instruction) {
    const response = await fetch(getApiUrl('/api/whatsapp/flow/ai-edit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentFlow, instruction }),
    });

    if (!response.ok) {
        let errMsg;
        try {
            const errData = await response.json();
            errMsg = errData.error || errData.message || `Failed (${response.status})`;
        } catch {
            errMsg = `AI flow edit failed (${response.status})`;
        }
        throw new Error(errMsg);
    }

    const data = await response.json();
    if (!data || !data.nodes) {
        throw new Error('AI flow edit returned invalid data.');
    }

    return data;
}
