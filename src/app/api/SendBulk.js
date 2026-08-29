import { SendBulkCampaign } from "./SendBulkCampaign";

export const sendBulk = async ({
    appuserid,
    userId,
    whatsappNumber,
    campaignId = 1,
    accountId = '',
} = {}) => {
    try {
        const body = {
            appuserid,
            userId,
            CampaignId: campaignId,
            ...(accountId ? { AccountId: accountId } : {}),
        };

        const response = await SendBulkCampaign(body, whatsappNumber);

        const isSuccess = response?.success || response?.stat === 1 || response?.stat_code === 1000;
        if (isSuccess) {
            return response;
        }

        return { success: false, data: [] };
    } catch (error) {
        console.error("Error in sendBulk:", error);
        return { data: [] };
    }
};
