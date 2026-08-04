import { callCommonApi } from "./CommonApi";

export const fetchWabaBilling = async (userId) => {
    try {
        const response = await callCommonApi({
            mode: "wallet_dashboard",
            f: "WABA ( wallet_dashboard )",
            p: "",
            userId,
        });

        const row = response?.Data?.rd?.[0] || null;

        if (!row) {
            return {
                success: false,
                data: null,
            };
        }

        return {
            success: true,
            data: {
                ...row,
                companyCode: row?.CompanyCode || '-',
                mobileNumber: row?.MobileNumber || '-',
                wabaId: row?.WabaId || '-',
                wabaPhoneNo: row?.WabaPhoneNo || '-',
                whatsappName: row?.WhatsappName || '',
                profilePictureUrl: row?.ProfilePictureUrl || '',
                totalBalance: Number(row?.TotalBalance || row?.BillAmount || 0),
                debitedBalance: Number(row?.DebitedBalance || 0),
                refundBalance: Number(row?.RefundBalance || 0),
                availableBalance: Number(row?.AvailableBalance || row?.CurrentAmount || 0),
            },
        };
    } catch (error) {
        console.error("Error fetching WABA billing:", error);
        return {
            success: false,
            data: null,
        };
    }
};
