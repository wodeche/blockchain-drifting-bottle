import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Bottle } from '../contracts/types';

interface BottleHistory {
  thrownBottles: Bottle[];
  pickedBottles: Bottle[];
  addThrownBottle: (bottle: Bottle) => void;
  addPickedBottle: (bottle: Bottle) => void;
  debug: () => void;
}

export const useBottleHistory = create<BottleHistory>()(
  persist(
    (set, get) => ({
      thrownBottles: [],
      pickedBottles: [],
      addThrownBottle: (bottle) => {
        console.log('正在添加投放的漂流瓶:', bottle);
        set((state) => ({
          ...state,
          thrownBottles: [...state.thrownBottles, bottle]
        }));
      },
      addPickedBottle: (bottle) => {
        console.log('正在添加捞取的漂流瓶:', bottle);
        set((state) => ({
          ...state,
          pickedBottles: [...state.pickedBottles, bottle]
        }));
      },
      debug: () => {
        const state = get();
        console.log('当前存储状态:', {
          thrownBottles: state.thrownBottles,
          pickedBottles: state.pickedBottles
        });
        return state;
      }
    }),
    {
      name: 'bottle-history',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        console.log('存储已恢复:', state);
        return state;
      }
    }
  )
);

export const debugBottleHistory = () => {
  const store = useBottleHistory.getState();
  console.log('Bottle History Store:', {
    thrownBottles: store.thrownBottles,
    pickedBottles: store.pickedBottles
  });
  return store;
}; 