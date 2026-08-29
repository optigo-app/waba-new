import { callCommonApi } from "./CommonApi";

export const fetchCampaignDetails = async (userId, campaignId, chatMsgStatus = null, templateId = null, accountId) => {
    try {
        const p = {
            CampaignId: campaignId,
            AccountId: Number(accountId) || 1,
        };

        // Add ChatMsgStatus to parameters if provided
        if (chatMsgStatus !== null && chatMsgStatus !== undefined && chatMsgStatus !== '') {
            p.ChatMsgStatus = chatMsgStatus;
        }

        // Add TemplateId to parameters if provided
        if (templateId !== null && templateId !== undefined && templateId !== '') {
            p.TemplateId = templateId;
        }

        const response = await callCommonApi({
            mode: "broadcast_camp_details",
            f: "Broadcast ( campaign details )",
            p: JSON.stringify(p),
            userId,
        });
        if (response?.Data) {
            return {
                success: true,
                data: response?.Data
            };
        } else {
            return {
                success: false,
                data: null
            };
        }
    } catch (error) {
        console.error('Error fetching campaign details:', error);
        return {
            success: false,
            data: null,
            error: error.message
        };
    }
};
