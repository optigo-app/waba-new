import { callCommonApi } from "./CommonApi";

export const fetchWabaBilling = async (userId, page = 1, pageSize = 20, searchTerm = '') => {
    try {
        const payload = { Page: page, PageSize: pageSize, SearchTerm: searchTerm };
        const response = await callCommonApi({
            mode: "wallet_dashboard",
            f: "WABA ( wallet_dashboard )",
            p: JSON.stringify(payload),
            userId,
        });

        const rows = response?.Data?.rd || [];

        if (!rows.length) {
            return {
                success: false,
                data: null,
                channels: [],
            };
        }

        const mapChannel = (row) => ({
            ...row,
            companyCode: row?.CompanyCode || '-',
            mobileNumber: row?.MobileNumber || '-',
            wabaId: row?.WabaId || '-',
            wabaPhoneNo: row?.WabaPhoneNo || '-',
            whatsappName: row?.WhatsappName || '',
            channelTitle: row?.ChannelTitle || '',
            channelImage: row?.ChannelImage || '',
            profilePictureUrl: row?.ChannelImage || row?.ProfilePictureUrl || row?.profile_picture_url || '',
            isDefault: Number(row?.IsDefault || 0) === 1,
            totalBalance: Number(row?.TotalBalance || row?.BillAmount || 0),
            debitedBalance: Number(row?.DebitedBalance || 0),
            refundBalance: Number(row?.RefundBalance || 0),
            availableBalance: Number(row?.AvailableBalance || row?.CurrentAmount || 0),
        });

        const channels = rows.map(mapChannel);
        const row = channels[0];

        return {
            success: true,
            data: row,
            channels,
        };
    } catch (error) {
        console.error("Error fetching WABA billing:", error);
        return {
            success: false,
            data: null,
        };
    }
};
