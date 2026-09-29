import { TEMPLATE_TESTSEND } from "./Config";
import { postJson } from "./postJson";
import { useChatStore } from "../store/chatStore";

const getChannelPhoneNo = () => {
    const ch = useChatStore.getState().selectedChannel;
    return ch?.WabaPhoneNo || ch?.MobileNumber || '';
};

export const sendTemplate = async (payload, wabaPhoneNo = '') => {
    try {
        const channelPhone = wabaPhoneNo || getChannelPhoneNo();
        const headerInit = channelPhone
            ? { overrides: { wabaphoneno: channelPhone, whatsappNumber: channelPhone } }
            : {};
        const data = await postJson(TEMPLATE_TESTSEND(), payload, undefined, headerInit);
        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error("sendTemplate Error:", error);
        return {
            success: false,
            data: null,
            error: error.message,
        };
    }
};
