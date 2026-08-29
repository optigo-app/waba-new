import { callCommonApi } from "./CommonApi";

export const fetchTemplateNameApi = async (userId, wabaid = '') => {
    try {
        const response = await callCommonApi({
            mode: "broadcast_template_list",
            f: "Broadcast ( broadcast_template_list )",
            p: "",
            userId,
            wabaid,
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