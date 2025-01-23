import { create } from 'zustand';

interface BottleStore {
  refetchAvailable: () => void;
  setRefetchAvailable: (refetch: () => void) => void;
}

export const useBottleStore = create<BottleStore>((set) => ({
  refetchAvailable: () => {},
  setRefetchAvailable: (refetch: () => void) => set({ refetchAvailable: refetch }),
})); 