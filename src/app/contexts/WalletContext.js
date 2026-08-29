'use client';

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { useWalletStore } from '../store/walletStore';
import { useAuth } from '../hooks/useAuth';

const WalletContext = createContext();

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};

export const WalletProvider = ({ children }) => {
    const { auth } = useAuth();
    const appUserId = auth?.id ?? auth?.userId ?? null;

    const billingData = useWalletStore((s) => s.billingData);
    const channels = useWalletStore((s) => s.channels);
    const isLoading = useWalletStore((s) => s.isLoading);
    const error = useWalletStore((s) => s.error);
    const lastAppUserId = useWalletStore((s) => s.lastAppUserId);
    const loadWalletData = useWalletStore((s) => s.loadWalletData);
    const refreshWallet = useWalletStore((s) => s.refreshWallet);
    const clearWallet = useWalletStore((s) => s.clearWallet);

    // Auto-fetch wallet data when auth is available and data is missing
    useEffect(() => {
        if (appUserId && (!billingData || lastAppUserId !== appUserId)) {
            loadWalletData(appUserId);
        }
    }, [appUserId, billingData, lastAppUserId, loadWalletData]);

    const walletInfo = useMemo(() => {
        if (!billingData) return null;

        const totalCredits = Number(billingData.totalBalance || 0);
        const availableBalance = Number(billingData.availableBalance || 0);
        const used = Math.max(0, totalCredits - availableBalance);
        const progressPercent = totalCredits > 0 ? Math.min(100, (used / totalCredits) * 100) : 0;

        return {
            ...billingData,
            totalCredits,
            availableBalance,
            used,
            progressPercent,
            refundBalance: Number(billingData.refundBalance || 0),
        };
    }, [billingData]);

    const hasSufficientBalance = useMemo(() => {
        return walletInfo && walletInfo.availableBalance > 1;
    }, [walletInfo]);

    const value = {
        billingData,
        channels,
        walletInfo,
        isLoading,
        error,
        hasSufficientBalance,
        loadWalletData,
        refreshWallet,
        clearWallet,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
};

export default WalletContext;
