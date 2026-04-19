"use client";
import Image from "next/image";
import { useCart } from "@/store/cart";
import { formatXAF } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function CartSidebar() {
  const { state, dispatch, total, count } = useCart();

  if (!state.isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => dispatch({ type: "CLOSE" })} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-lg">Mon Panier</h2>
            <p className="text-sm text-gray-500">{count} article{count > 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => dispatch({ type: "CLOSE" })} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 font-medium">Votre panier est vide</p>
              <p className="text-sm text-gray-400 mt-1">Découvrez nos produits</p>
              <Button onClick={() => dispatch({ type: "CLOSE" })} className="mt-4" size="sm">
                Continuer les achats
              </Button>
            </div>
          ) : (
            state.items.map((item) => (
              <div key={item.product.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 relative">
                  <Image
                    src={item.product.images[0]}
                    alt={item.product.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2">{item.product.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.product.vendor.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-[#00A550] text-sm">{formatXAF(item.product.price)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => dispatch({ type: "UPDATE_QTY", id: item.product.id, qty: item.quantity - 1 })}
                        className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold transition-colors"
                      >
                        −
                      </button>
                      <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => dispatch({ type: "UPDATE_QTY", id: item.product.id, qty: item.quantity + 1 })}
                        className="w-6 h-6 rounded-full bg-[#00A550] hover:bg-[#007A3D] text-white flex items-center justify-center text-sm font-bold transition-colors"
                      >
                        +
                      </button>
                      <button
                        onClick={() => dispatch({ type: "REMOVE", id: item.product.id })}
                        className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center ml-1 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {state.items.length > 0 && (
          <div className="p-5 border-t bg-white space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Sous-total</span>
              <span className="font-bold text-lg">{formatXAF(total)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Livraison</span>
              <span className="text-[#00A550] font-medium">Calculée au checkout</span>
            </div>
            <Link href="/checkout" onClick={() => dispatch({ type: "CLOSE" })}>
              <Button fullWidth size="lg" className="mt-2">
                Commander — {formatXAF(total)}
              </Button>
            </Link>
            <button
              onClick={() => dispatch({ type: "CLOSE" })}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              Continuer les achats
            </button>
          </div>
        )}
      </div>
    </>
  );
}
