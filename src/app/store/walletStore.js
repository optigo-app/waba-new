'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchWabaBilling } from '../api/WabaBilling';
import { createSessionStorageAdapter } from '../utils/storage';

export const useWalletStore = create(
  persist(
    (set, get) => ({
      billingData: null,
      channels: [],
      lastAppUserId: null,
      isLoading: false,
      error: null,

      loadWalletData: async (appUserId) => {
        if (!appUserId) {
          set({ billingData: null, lastAppUserId: null, isLoading: false });
          return;
        }

        const state = get();
        if (state.billingData && state.lastAppUserId === appUserId && !state.error) {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const response = await fetchWabaBilling(appUserId);
          if (response?.success) {
            set({
              billingData: response.data,
              channels: response.channels || [],
              lastAppUserId: appUserId,
              isLoading: false,
              error: null,
            });
          } else {
            set({ billingData: null, channels: [], lastAppUserId: null, isLoading: false, error: 'Failed to load wallet data' });
          }
        } catch (err) {
          console.error('Error fetching wallet data:', err);
          set({ billingData: null, channels: [], lastAppUserId: null, isLoading: false, error: err.message || 'Failed to load wallet data' });
        }
      },

      refreshWallet: () => {
        const { lastAppUserId, loadWalletData } = get();
        if (lastAppUserId) {
          set({ billingData: null, error: null });
          loadWalletData(lastAppUserId);
        }
      },

      clearWallet: () => {
        set({ billingData: null, channels: [], lastAppUserId: null, error: null, isLoading: false });
      },
    }),
    {
      name: 'wallet-store',
      storage: createSessionStorageAdapter(),
      partialize: (state) => ({
        billingData: state.billingData,
        channels: state.channels,
        lastAppUserId: state.lastAppUserId,
      }),
    }
  )
);
