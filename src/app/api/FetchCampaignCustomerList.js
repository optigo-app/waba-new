import { callCommonApi } from "./CommonApi";

export const fetchCampaignCustomerList = async (userId, campaignId) => {
    try {
        const p = { CampaignId: campaignId };
        const response = await callCommonApi({
            mode: "broadcast_customer_list",
            f: "Broadcast ( campaign details )",
            p: JSON.stringify(p),
            userId,
        });
        if (response?.Data) {
            return { success: true, data: response.Data };
        } else {
            return { success: false, data: null };
        }
    } catch (error) {
        console.error('Error fetching campaign customer list:', error);
        return { success: false, data: null, error: error.message };
    }
};
