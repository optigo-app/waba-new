'use client';

import { APIURL, getHeaders } from "./Config";
import { getClientIp, setClientIp } from "../utils/storage";

let ipFetchPromise = null;

// for public ip address
export const getClientIpAddress = async () => {
    try {
        const cachedIp = getClientIp();
        if (cachedIp) return cachedIp;

        if (ipFetchPromise) return ipFetchPromise;

        ipFetchPromise = (async () => {
            try {
                const res = await fetch("https://api.ipify.org?format=json");
                const data = await res.json();
                const ip = data?.ip || "";
                setClientIp(ip);
                return ip;
            } catch (err) {
                console.error("Error fetching IP address:", err);
                return "";
            } finally {
                ipFetchPromise = null;
            }
        })();

        return ipFetchPromise;
    } catch (error) {
        console.error("Error fetching IP address:", error);
        return "";
    }
};

export const buildApiBody = async ({ mode, f, p = '', userId = '', extraCon = {} }) => {
    const ip = await getClientIpAddress();
    const con = {
        id: "",
        mode,
        appuserid: String(userId || ""),
        IPAddress: ip,
        ...extraCon,
    };

    return {
        con: JSON.stringify(con),
        p: p ?? "",
        f: f ?? "",
    };
};

export const callCommonApi = async ({ mode, f, p = '', userId = '', extraCon = {}, signal, wabaid = '', overrides = {} }) => {
    const body = await buildApiBody({ mode, f, p, userId, extraCon });
    return CommonAPI(body, signal, { wabaid, overrides });
};

export const CommonAPI = async (body, signal, headerInit = {}) => {
    try {
        const headers = getHeaders(headerInit);
        const fetchOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
            body: JSON.stringify(body),
        };
        if (signal instanceof AbortSignal) {
            fetchOptions.signal = signal;
        }
        const response = await fetch(APIURL(), fetchOptions);

        if (!response.ok) {
            console.error("API Error:", response.statusText);
            return null;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        if (error.name === "AbortError") {
            console.log("Request canceled:", error.message);
            throw new Error("AbortError");
        }
        console.error("API Error:", error);
        return null;
    }
};

    