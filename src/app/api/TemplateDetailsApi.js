import { callCommonApi } from "./CommonApi";

/**
 * Fetch a single template's details by TemplateId.
 *
 * @param {string} userId - Auth user id
 * @param {string|number} templateId - The template Id to fetch
 * @param {string} accountId - Channel Id (for AccountId in payload)
 * @param {string} wabaId - WabaId (for header)
 * @param {AbortSignal} signal - Optional abort signal
 * @returns {Promise<Object|null>} - Template data object or null
 */
export const fetchTemplateDetails = async (userId, templateId, accountId = '', wabaId = '', signal) => {
    try {
        const response = await callCommonApi({
            mode: "broadcast_temp_details",
            f: "Broadcast ( Template details )",
            p: JSON.stringify({
                AccountId: accountId !== undefined && accountId !== '' ? Number(accountId) : '',
                WabaId: wabaId || '',
                TemplateName: "",
                TemplateId: templateId ? Number(templateId) : '',
            }),
            userId,
            signal,
            wabaid: wabaId,
        });
        if (response?.Data) {
            return {
                data: response?.Data?.rd?.[0] || response?.Data?.rd || null,
            };
        } else {
            return { data: null };
        }
    } catch (error) {
        if (error?.name === 'AbortError') throw error;
        console.error('fetchTemplateDetails error:', error);
        return { data: null };
    }
};
