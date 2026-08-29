import { callCommonApi } from "./CommonApi";

export const fetchQuickReport = async (userId, campaignId, accountId) => {
    try {

        const p = {
            CampaignId: campaignId,
            AccountId: accountId !== undefined && accountId !== '' ? Number(accountId) : '',
        };

        const response = await callCommonApi({
            mode: "broadcast_camp_dashboard",
            f: "Broadcast ( broadcast_camp_dashboard )",
            p: JSON.stringify(p),
            userId,
        });
        const data = response?.rd?.[0] || response?.Data || response;

        if (data) {
            return {
                success: true,
                data: data
            };
        } else {
            console.log('No data found in response');
            return {
                success: false,
                data: null
            };
        }
    } catch (error) {
        console.error('Error fetching quick report:', error);
        return {
            success: false,
            data: null,
            error: error.message
        };
    }
};
