import { callCommonApi } from "./CommonApi";

export const campaignDeleteApi = async (CampaignId, userId, accountId) => {
    try {
        const response = await callCommonApi({
            mode: "broadcast_camp_delete",
            f: "Broadcast ( broadcast_camp_delete )",
            p: JSON.stringify({ "CampaignId": CampaignId, AccountId: Number(accountId) || 1 }),
            userId,
        });
        if (response?.Data) {
            return {
                data: response?.Data?.rd || [],
            };
        } else {
            return {
                data: [],
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            data: [],
        };
    }
};