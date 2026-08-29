import { callCommonApi } from "./CommonApi";

export const deleteCampaign = async (userId, campaignId, accountId) => {
    try {
        const response = await callCommonApi({
            mode: "broadcast_camp_delete",
            f: "Broadcast ( Campaign Delete )",
            p: JSON.stringify({ CampaignId: String(campaignId), AccountId: Number(accountId) || 1 }),
            userId,
        });
        if (response?.Data) {
            return {
                success: true,
                data: response?.Data,
            };
        } else {
            return {
                success: false,
                data: null,
            };
        }
    } catch (error) {
        console.error('Error deleting campaign:', error);
        return {
            success: false,
            data: null,
            error: error?.response?.data || error.message,
        };
    }
};
