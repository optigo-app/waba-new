import { callCommonApi } from "./CommonApi";

/**
 * Fetches template messages for a campaign
 * @param {string} userId - User ID
 * @param {number} campaignId - Campaign ID
 * @param {number} templateId - Template ID
 * @param {number} chatMsgStatus - Chat message status filter
 * @param {number|string} accountId - Channel/Account ID
 */
export const fetchTemplateMessages = async (userId, campaignId, templateId, chatMsgStatus, accountId) => {
    try {
        const p = {
            CampaignId: campaignId ?? '',
            TemplateId: templateId ?? '',
            ChatMsgStatus: chatMsgStatus ?? '',
            AccountId: accountId !== undefined && accountId !== '' ? Number(accountId) : ''
        };

        const body = {
            "con": `{"id":"","mode":"broadcast_camp_temp","appuserid":"${userId}"}`,
            p: JSON.stringify(p),
            f: "Broadcast ( broadcast_camp_temp )"
        };

        const response = await callCommonApi({
            mode: "broadcast_camp_temp",
            f: "Broadcast ( broadcast_camp_temp )",
            p: JSON.stringify(p),
            userId,
        });
        
        if (response?.Data) {
            return {
                success: true,
                data: response.Data,
                stats: response.Data?.rd?.[0] || null,
                messages: response.Data?.rd1 || []
            };
        } else {
            return {
                success: false,
                data: [],
                stats: null,
                messages: []
            };
        }
    } catch (error) {
        console.error('Error fetching template messages:', error);
        return {
            success: false,
            data: [],
            error: error.message
        };
    }
};
