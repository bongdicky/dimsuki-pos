import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, Search, Receipt, Printer, Download, X, Check, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { supabase } from './lib/supabase';

const paymentMethods = [
  { id: 'cash', name: 'Tunai', icon: Banknote },
  { id: 'qris', name: 'QRIS', icon: Smartphone },
  { id: 'debit', name: 'Debit Card', icon: CreditCard },
  { id: 'transfer', name: 'Transfer', icon: CreditCard },
];

export default function DimsumPOS() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [cashAmount, setCashAmount] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (categoriesError) throw categoriesError;

      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select(`
          *,
          category:categories(name),
          variants:menu_variants(*)
        `)
        .eq('is_available', true)
        .order('name');
      if (menuError) throw menuError;

      const formattedMenu = menuData.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category.name,
        image: item.emoji || '🥟',
        variants: item.variants.map(v => ({
          id: v.id,
          size: v.size,
          price: v.price
        }))
      }));

      setCategories(['Semua', ...categoriesData.map(c => c.name)]);
      setMenuItems(formattedMenu);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Gagal memuat data menu. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMenu = menuItems.filter(item => {
    const matchCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const addToCart = (item, variant) => {
    const cartItem = {
      id: variant.id,
      menuId: item.id,
      name: item.name,
      variant: variant.size,
      price: variant.price,
      quantity: 1
    };
    const existingIndex = cart.findIndex(c => c.id === variant.id);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, cartItem]);
    }
  };

  const updateQuantity = (id, delta) => {
    const newCart = cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return { ...item, quantity: Math.max(0, newQty) };
      }
      return item;
    }).filter(item => item.quantity > 0);
    setCart(newCart);
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = 0;
  const total = subtotal + tax;

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${dateStr}-${randomNum}`;
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Keranjang masih kosong!');
      return;
    }
    setShowPaymentModal(true);
    setSelectedPayment(null);
    setCashAmount('');
  };

  const processPayment = async () => {
    if (!selectedPayment) {
      alert('Pilih metode pembayaran terlebih dahulu!');
      return;
    }
    if (selectedPayment === 'cash') {
      const cash = parseFloat(cashAmount);
      if (!cash || cash < total) {
        alert('Jumlah tunai tidak mencukupi!');
        return;
      }
    }

    try {
      const transaction = {
        order_number: generateOrderNumber(),
        branch: 'Outlet 1',
        items: cart,
        subtotal,
        tax,
        total,
        payment_method: selectedPayment,
        cash_amount: selectedPayment === 'cash' ? parseFloat(cashAmount) : total,
        change_amount: selectedPayment === 'cash' ? parseFloat(cashAmount) - total : 0,
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;

      setCurrentTransaction({
        ...transaction,
        orderNumber: transaction.order_number,
        date: new Date().toISOString(),
        paymentMethod: transaction.payment_method,
        cashAmount: transaction.cash_amount,
        change: transaction.change_amount,
      });

      setShowPaymentModal(false);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Gagal menyimpan transaksi. Silakan coba lagi.');
    }
  };

  const handlePrintReceipt = (type) => {
    if (type === 'physical') {
      window.print();
    } else {
      generateTextReceipt();
    }
  };

  const generateTextReceipt = () => {
    if (!currentTransaction) return;
    const receipt = `
================================================
           DIMSUM OUTLET 1
           Struk Pembayaran
================================================
No. Order    : ${currentTransaction.orderNumber}
Tanggal      : ${new Date(currentTransaction.date).toLocaleString('id-ID')}
Cabang       : ${currentTransaction.branch}
================================================

PESANAN:
------------------------------------------------
${currentTransaction.items.map(item => 
  `${item.name} (${item.variant})
 ${item.quantity} x ${formatRupiah(item.price)} = ${formatRupiah(item.price * item.quantity)}`
).join('\n')}
------------------------------------------------

Subtotal     : ${formatRupiah(currentTransaction.subtotal)}
${currentTransaction.tax > 0 ? `Pajak        : ${formatRupiah(currentTransaction.tax)}\n` : ''}TOTAL        : ${formatRupiah(currentTransaction.total)}

Pembayaran   : ${paymentMethods.find(p => p.id === currentTransaction.paymentMethod)?.name}
${currentTransaction.paymentMethod === 'cash' ? 
`Tunai        : ${formatRupiah(currentTransaction.cashAmount)}
Kembalian    : ${formatRupiah(currentTransaction.change)}` : ''}

================================================
      Terima Kasih Atas Kunjungan Anda!
           Sampai Jumpa Lagi!
================================================
    `;
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `struk-${currentTransaction.orderNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNewOrder = () => {
    setShowSuccessModal(false);
    setCurrentTransaction(null);
    setCart([]);
    setSelectedPayment(null);
    setCashAmount('');
  };

  const quickCashAmounts = [50000, 100000, 150000, 200000];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Dimsum POS</h1>
            <div className="text-sm text-gray-600">
              <span className="font-semibold">Cabang:</span> Outlet 1
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari menu..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="bg-white border-b px-4 py-3 overflow-x-auto">
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMenu.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="aspect-square bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-6xl">
                  {item.image}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-800 mb-1">{item.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{item.category}</p>
                  <div className="space-y-1">
                    {item.variants.map(variant => (
                      <button
                        key={variant.id}
                        onClick={() => addToCart(item, variant)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-orange-50 rounded-lg transition-colors text-sm group"
                      >
                        <span className="text-gray-700 group-hover:text-orange-600">{variant.size}</span>
                        <span className="font-semibold text-orange-600">{formatRupiah(variant.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-96 bg-white shadow-lg flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 text-gray-800">
            <ShoppingCart className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Pesanan</h2>
            <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} item
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingCart className="w-16 h-16 mb-2" />
              <p>Keranjang kosong</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 text-sm">{item.name}</h4>
                      <p className="text-xs text-gray-500">{item.variant}</p>
                      <p className="text-sm font-semibold text-orange-600 mt-1">{formatRupiah(item.price)}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-sm font-bold text-gray-800">{formatRupiah(item.price * item.quantity)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold">{formatRupiah(subtotal)}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pajak</span>
              <span className="font-semibold">{formatRupiah(tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-3">
            <span>Total</span>
            <span className="text-orange-600">{formatRupiah(total)}</span>
          </div>
          <button onClick={handleCheckout} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <Receipt className="w-5 h-5" />
            Bayar Sekarang
          </button>
        </div>
      </div>
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Metode Pembayaran</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mb-6">
                <div className="bg-orange-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">Total Pembayaran</p>
                  <p className="text-2xl font-bold text-orange-600">{formatRupiah(total)}</p>
                </div>
                <div className="space-y-2">
                  {paymentMethods.map(method => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setSelectedPayment(method.id)}
                        className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          selectedPayment === method.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'
                        }`}
                      >
                        <Icon className={`w-6 h-6 ${selectedPayment === method.id ? 'text-orange-600' : 'text-gray-400'}`} />
                        <span className={`font-medium ${selectedPayment === method.id ? 'text-orange-600' : 'text-gray-700'}`}>
                          {method.name}
                        </span>
                        {selectedPayment === method.id && <Check className="w-5 h-5 text-orange-600 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedPayment === 'cash' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah Tunai</label>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="Masukkan jumlah tunai"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {quickCashAmounts.map(amount => (
                      <button
                        key={amount}
                        onClick={() => setCashAmount(amount.toString())}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
                      >
                        {amount / 1000}k
                      </button>
                    ))}
                  </div>
                  {cashAmount && parseFloat(cashAmount) >= total && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Kembalian</p>
                      <p className="text-lg font-bold text-green-600">{formatRupiah(parseFloat(cashAmount) - total)}</p>
                    </div>
                  )}
                </div>
              )}
              <button onClick={processPayment} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors">
                Proses Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}
      {showSuccessModal && currentTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Pembayaran Berhasil!</h3>
                <p className="text-gray-600">Transaksi telah berhasil diproses</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">No. Order</span>
                  <span className="font-semibold">{currentTransaction.orderNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-semibold">{formatRupiah(currentTransaction.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pembayaran</span>
                  <span className="font-semibold">{paymentMethods.find(p => p.id === currentTransaction.paymentMethod)?.name}</span>
                </div>
                {currentTransaction.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tunai</span>
                      <span className="font-semibold">{formatRupiah(currentTransaction.cashAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Kembalian</span>
                      <span className="font-semibold text-green-600">{formatRupiah(currentTransaction.change)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2 mb-6">
                <button onClick={() => handlePrintReceipt('physical')} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <Printer className="w-5 h-5" />
                  Cetak Struk Fisik
                </button>
                <button onClick={() => handlePrintReceipt('digital')} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <Download className="w-5 h-5" />
                  Download Struk Digital
                </button>
              </div>
              <button onClick={handleNewOrder} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors">
                Pesanan Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}