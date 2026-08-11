import {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';

const CartContext = createContext(null);

export function CartProvider({children, initialCart}) {
  const [cart, setCart] = useState(null);
  const cartVersion = useRef(0);

  const setLiveCart = useCallback((nextCart) => {
    cartVersion.current += 1;
    setCart((currentCart) =>
      typeof nextCart === 'function' ? nextCart(currentCart) : nextCart ?? null,
    );
  }, []);

  useEffect(() => {
    let active = true;
    const version = cartVersion.current;

    Promise.resolve(initialCart).then((resolvedCart) => {
      if (active && version === cartVersion.current) {
        setCart(resolvedCart ?? null);
      }
    });

    return () => {
      active = false;
    };
  }, [initialCart]);

  return (
    <CartContext.Provider value={{cart, setCart: setLiveCart}}>
      {children}
    </CartContext.Provider>
  );
}

export function useLiveCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useLiveCart must be used within CartProvider');
  }

  return context;
}
