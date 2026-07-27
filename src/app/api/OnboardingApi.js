import { ONBOARDING } from "./Config";
import { postJson } from "./postJson";
import { callCommonApi } from "./CommonApi";

export const exchangeToken = async (code, redirectUri = '', phoneNumberId = '', wabaId = '') => {
    try {
        const data = await postJson(ONBOARDING, {
            code,
            redirect_uri: redirectUri,
            phone_number_id: phoneNumberId,
            waba_id: wabaId,
        });
        if (data && typeof data.success === 'boolean') {
            return data;
        }
        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error("exchangeToken Error:", error);
        return {
            success: false,
            data: null,
            error: error.message,
        };
    }
};

export const saveOnboardingData = async (userId, credentials) => {
    try {
        const response = await callCommonApi({
            mode: "save_onboarding",
            f: "WABA ( save_onboarding )",
            p: JSON.stringify(credentials),
            userId,
        });
        return {
            success: !!response?.Data?.rd?.[0]?.stat || response?.success,
            data: response?.Data?.rd?.[0] || response,
        };
    } catch (error) {
        console.error("Error saving onboarding data:", error);
        return {
            success: false,
            data: null,
        };
    }
};

