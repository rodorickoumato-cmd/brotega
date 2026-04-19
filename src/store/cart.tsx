"use client";
import { createContext, useContext, useReducer, ReactNode } from "react";
import { CartItem, Product } from "@/types";

type State = { items: CartItem[]; isOpen: boolean };
type Action =
  | { type: "ADD"; product: Product; qty?: number }
  | { type: "REMOVE"; id: string }
  | { type: "UPDATE_QTY"; id: string; qty: number }
  | { type: "CLEAR" }
  | { type: "TOGGLE" }
  | { type: "CLOSE" };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD": {
      const exists = state.items.find((i) => i.product.id === action.product.id);
      if (exists) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.product.id === action.product.id
              ? { ...i, quantity: i.quantity + (action.qty ?? 1) }
              : i
          ),
        };
      }
      return { ...state, items: [...state.items, { product: action.product, quantity: action.qty ?? 1 }] };
    }
    case "REMOVE":
      return { ...state, items: state.items.filter((i) => i.product.id !== action.id) };
    case "UPDATE_QTY":
      return {
        ...state,
        items: state.items.map((i) =>
          i.product.id === action.id ? { ...i, quantity: action.qty } : i
        ).filter((i) => i.quantity > 0),
      };
    case "CLEAR":
      return { ...state, items: [] };
    case "TOGGLE":
      return { ...state, isOpen: !state.isOpen };
    case "CLOSE":
      return { ...state, isOpen: false };
    default:
      return state;
  }
};

const CartCtx = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
  total: number;
  count: number;
} | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], isOpen: false });
  const total = state.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const count = state.items.reduce((s, i) => s + i.quantity, 0);
  return <CartCtx.Provider value={{ state, dispatch, total, count }}>{children}</CartCtx.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
};
