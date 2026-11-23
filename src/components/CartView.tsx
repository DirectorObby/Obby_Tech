import React, { useState, useEffect } from 'react';
import { ShoppingBag, Trash2, X, Check, ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import { OrderItem } from '../types';

interface CartViewProps {
  cartItems: OrderItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: (selectedItems: OrderItem[]) => void;
  onContinueShopping: () => void;
  outsideDarFee: number;
}

export const CartView: React.FC<CartViewProps> = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onContinueShopping,
  outsideDarFee,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    cartItems.map((i) => i.productId)
  );

  // Keep selectedIds synced when new items are added or removed
  useEffect(() => {
    setSelectedIds((prev) => {
      const currentIds = new Set(cartItems.map((i) => i.productId));
      const kept = prev.filter((id) => currentIds.has(id));
      const newlyAdded = cartItems
        .map((i) => i.productId)
        .filter((id) => !prev.includes(id));
      return [...kept, ...newlyAdded];
    });
  }, [cartItems]);

  const allSelected =
    cartItems.length > 0 && cartItems.every((item) => selectedIds.includes(item.productId));

  const toggleSelectItem = (productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartItems.map((i) => i.productId));
    }
  };

  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.productId));
  const selectedSubtotal = selectedItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  if (cartItems.length === 0) {
    return (
      <div className="bg-white min-h-[65vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-[#F5F6F8] rounded-full flex items-center justify-center mb-3.5">
          <ShoppingBag className="w-7 h-7 text-gray-400" />
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-1">Your Shopping Cart is Empty</h2>
        <p className="text-xs text-gray-500 mb-5 max-w-xs leading-relaxed">
          Explore our collection of Phones, Laptops, CCTV, and Accessories from Obby Tech.
        </p>
        <button
          type="button"
          onClick={onContinueShopping}
          className="bg-[#111827] text-white font-semibold text-sm px-7 py-3 rounded-full hover:bg-black transition-colors cursor-pointer"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-[82vh] max-w-2xl mx-auto flex flex-col justify-between pb-36">
      <div>
        {/* Header matching reference screenshot */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h1 className="text-[19px] font-bold text-gray-900 tracking-tight">Shopping Cart</h1>
          <button
            type="button"
            onClick={onContinueShopping}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="divide-y divide-gray-100 px-4">
          {cartItems.map((item) => {
            const isSelected = selectedIds.includes(item.productId);
            return (
              <div key={item.productId} className="py-4 flex items-center gap-3">
                {/* Green Circle Check */}
                <button
                  type="button"
                  onClick={() => toggleSelectItem(item.productId)}
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#65C41C] text-white'
                      : 'border-2 border-gray-300 bg-white'
                  }`}
                  aria-label={`Select ${item.productName}`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                {/* Square Light Gray Product Thumbnail */}
                <div className="w-24 h-24 rounded-lg bg-[#F5F6F8] flex-shrink-0 flex items-center justify-center p-2 overflow-hidden">
                  <img
                    src={
                      item.productImage ||
                      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'
                    }
                    alt={item.productName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Product Details & Controls */}
                <div className="flex-1 min-w-0 flex flex-col justify-between min-h-[96px]">
                  <div>
                    <h3 className="text-[13px] font-medium text-gray-900 leading-snug line-clamp-2">
                      {item.productName}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Obby Tech Official</p>
                  </div>

                  <div className="mt-1.5">
                    <div className="text-[15px] font-bold text-[#1565C0] tabular-nums">
                      TSh {item.price.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Minimal < qty > Stepper */}
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded bg-[#F4F5F7] hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-[13px] font-semibold text-gray-900 tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded bg-[#F4F5F7] hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Delete Item Button */}
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.productId)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                      aria-label={`Remove ${item.productName}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Clean Delivery Policy Note */}
        <div className="mx-4 mt-2 bg-[#F5F6F8] rounded-xl p-3.5 flex items-start gap-2.5">
          <Truck className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-gray-600 leading-relaxed">
            <span className="font-semibold text-gray-900">Obby Tech Delivery:</span> Dodoma
            express delivery available. Customers outside Dodoma pay TSh{' '}
            {outsideDarFee.toLocaleString()} regional transport fee at checkout.
          </div>
        </div>
      </div>

      {/* Bottom Summary & Dual Pill Action Bar (Fixed above BottomNav) */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-3.5 space-y-3">
          {/* ALL Toggle & Subtotal */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                  allSelected
                    ? 'bg-[#65C41C] text-white'
                    : 'border-2 border-gray-300 bg-white'
                }`}
              >
                {allSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
              <span className="text-xs font-medium text-gray-700 tracking-wide">ALL</span>
            </button>

            <div className="text-right">
              <div className="text-[11px] text-gray-400 font-medium leading-none mb-1">
                Subtotal ({selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'})
              </div>
              <div className="text-[16px] font-bold text-[#1565C0] tabular-nums leading-none">
                TSh {selectedSubtotal.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Dual Pill Buttons */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={onContinueShopping}
              className="w-full bg-white text-gray-900 border border-gray-900 py-2.5 px-4 rounded-full font-semibold text-[13px] hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Continue Shopping
            </button>
            <button
              type="button"
              disabled={selectedItems.length === 0}
              onClick={() => onProceedToCheckout(selectedItems)}
              className="w-full bg-[#111827] text-white py-3 px-4 rounded-full font-semibold text-[13px] hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
