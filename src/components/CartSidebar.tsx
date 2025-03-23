import { X, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { Button } from './ui/button';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function CartSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const { items, removeItem, total, clearCart } = useCartStore();

  const handleCheckout = async () => {
    if (!phoneNumber) {
      toast.error('Please enter your M-Pesa number');
      return;
    }

    // Simulate M-Pesa STK push
    toast.loading('Processing M-Pesa payment...');
    try {
      // Here you would integrate with your backend for M-Pesa
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('STK Push sent to your phone. Please complete the payment.');
      clearCart();
      setIsOpen(false);
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="fixed right-4 bottom-4 z-50"
      >
        <ShoppingCart className="h-5 w-5 mr-2" />
        <span className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs">
          {items.length}
        </span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 h-full w-full sm:w-96 bg-background z-50 shadow-xl"
            >
              <div className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Your Cart</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-auto">
                  {items.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Your cart is empty
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-card p-4 rounded-lg flex justify-between items-center"
                        >
                          <div>
                            <h3 className="font-semibold">
                              {item.quantity} {item.type}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {item.platform} - {item.quality}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-semibold">${item.price}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {items.length > 0 && (
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total:</span>
                      <span className="text-xl font-bold">${total.toFixed(2)}</span>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        M-Pesa Number
                      </label>
                      <input
                        type="tel"
                        placeholder="254700000000"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md bg-background"
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleCheckout}
                    >
                      Pay with M-Pesa
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}