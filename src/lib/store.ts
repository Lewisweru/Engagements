import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  platform: string;
  type: string;
  quantity: number;
  price: number;
  quality: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);
          if (existingItem) {
            return state;
          }
          const newTotal = state.total + item.price;
          return { items: [...state.items, item], total: newTotal };
        });
      },
      removeItem: (id) => {
        set((state) => {
          const item = state.items.find((i) => i.id === id);
          const newTotal = item ? state.total - item.price : state.total;
          return {
            items: state.items.filter((i) => i.id !== id),
            total: newTotal,
          };
        });
      },
      clearCart: () => set({ items: [], total: 0 }),
    }),
    {
      name: 'cart-storage',
    }
  )
);