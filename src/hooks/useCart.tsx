import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId)

      const stock = await api.get(`/stock/${productId}`);
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        productExists.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`)

        const newProduct = {
          ...product.data,
          amount: 1,
        }

        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const products = [...cart];

      const productExists = products.find(product => product.id === productId);

      if(!productExists) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const newProducts = products.filter(product => product.id !== productId);

      setCart(newProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newProducts))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const products = [...cart];

      const selectedProduct = products.find(product => product.id === productId);
      const stock = await api.get(`/stock/${productId}`);

      if(!selectedProduct || amount <= 0) {
        return;
      }

      const productNotInStock = selectedProduct.amount > stock.data.amount - 1;
      const isIncrement = selectedProduct.amount < amount;

      if(productNotInStock && isIncrement) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      selectedProduct.amount = amount;  

      const productsFiltered = products.filter(product => product.id !== productId);

      const newProducts = [...productsFiltered, selectedProduct];

      setCart(newProducts);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newProducts));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
