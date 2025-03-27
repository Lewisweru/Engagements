import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  platform: string;
  service: string;
  type: string;
  quantity: number;
  price: number;
  quality: string;
  accountLink?: string; // Optional to avoid errors
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
    (set) => ({
      items: [],
      total: 0,
      addItem: (item) => {
        set((state) => {
          // Ensure duplicates are not added
          const existingItem = state.items.find(
            (i) =>
              i.platform === item.platform &&
              i.service === item.service &&
              i.accountLink === item.accountLink
          );

          if (existingItem) {
            return state; // Prevent duplicate exact items
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
