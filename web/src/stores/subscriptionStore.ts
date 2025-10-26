import { create } from 'zustand';

interface SubscriptionStore {
  baseUrl: string | null;
  isLoading: boolean;
  setBaseUrl: (url: string) => void;
  setLoading: (loading: boolean) => void;
  clearBaseUrl: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  baseUrl: null,
  isLoading: false,
  setBaseUrl: (url: string) => set({ baseUrl: url }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  clearBaseUrl: () => set({ baseUrl: null }),
}));
