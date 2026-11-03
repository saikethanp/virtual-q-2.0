import React, { createContext, useContext, useState, useEffect } from 'react';
import { MenuItem, CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  businessId: string | null;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('vq_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [businessId, setBusinessId] = useState<string | null>(() => {
    return localStorage.getItem('vq_cart_biz_id') || null;
  });

  useEffect(() => {
    localStorage.setItem('vq_cart', JSON.stringify(items));
    if (items.length === 0) {
      localStorage.removeItem('vq_cart_biz_id');
      setBusinessId(null);
    }
  }, [items]);

  const addToCart = (menuItem: MenuItem) => {
    // If cart has items from different business, reset cart to new business
    if (businessId && businessId !== menuItem.business_id) {
      if (!window.confirm('Adding items from a new business will clear your current cart. Continue?')) {
        return;
      }
      setItems([{ menuItem, quantity: 1 }]);
      setBusinessId(menuItem.business_id);
      localStorage.setItem('vq_cart_biz_id', menuItem.business_id);
      return;
    }

    setBusinessId(menuItem.business_id);
    localStorage.setItem('vq_cart_biz_id', menuItem.business_id);

    setItems(prev => {
      const existing = prev.find(i => i.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setItems(prev => prev.filter(i => i.menuItem.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setItems(prev => {
      return prev.map(i => {
        if (i.menuItem.id === itemId) {
          const newQty = i.quantity + delta;
          return newQty > 0 ? { ...i, quantity: newQty } : null;
        }
        return i;
      }).filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setItems([]);
    setBusinessId(null);
    localStorage.removeItem('vq_cart');
    localStorage.removeItem('vq_cart_biz_id');
  };

  const subtotal = items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      businessId,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      subtotal,
      itemCount
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
