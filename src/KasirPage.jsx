import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2, ShoppingCart, Search, Receipt, Printer, Download, X, Check, CreditCard, Smartphone, Banknote, BarChart3, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth } from './AuthContext';

const paymentMethods = [
  { id: 'cash', name: 'Tunai', icon: Banknote },
  { id: 'qris', name: 'QRIS', icon: Smartphone },
  { id: 'debit', name: 'Debit Card', icon: CreditCard },
  { id: 'transfer', name: 'Transfer', icon: CreditCard },
];

export default function KasirPage() {
  const navigate = useNavigate();
  const { user, logout, isOwner, branches, selectedBranch, changeBranch, getCurrentBranch } = useAuth();
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
  const [showCart, setShowCart] = useState(false);

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
    setShowCart(false);
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
        branch: getCurrentBranch()?.name || 'Outlet 1',
        branch_id: selectedBranch,
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
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 sticky top-0 z-40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Dimsum POS</h1>
            {isOwner && branches.length > 1 && (
              <select
                value={selectedBranch}
                onChange={(e) => changeBranch(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            )}
            {!isOwner && user && (
              <span className="text-sm text-gray-600 px-3 py-1 bg-gray-100 rounded-lg">
                {getCurrentBranch()?.name}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {isOwner && (
              <>
                <button
                  onClick={() => navigate('/management')}
                  className="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium active:bg-purple-600"
                >
                  <span className="hidden md:inline">Menu</span>
                  <span className="md:hidden">📋</span>
                </button>
                <button
                  onClick={() => navigate('/laporan')}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium active:bg-blue-600"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden md:inline">Laporan</span>
                </button>
              </>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium active:bg-red-600"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari menu..."
            className="w-full pl-10 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white border-b px-4 py-3 overflow-x-auto sticky top-[140px] md:top-[120px] z-30">
        <div className="flex gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2.5 rounded-lg font-medium whitespace-nowrap transition-colors text-sm md:text-base ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filteredMenu.map(item => (
            <div key={item.id} className="bg-white rounded-lg shadow-sm active:shadow-md transition-shadow overflow-hidden">
              <div className="aspect-square bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-5xl md:text-6xl">
                {item.image}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-gray-800 mb-1 text-sm md:text-base">{item.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{item.category}</p>
                <div className="space-y-1.5">
                  {item.variants.map(variant => (
                    <button
                      key={variant.id}
                      onClick={() => addToCart(item, variant)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 active:bg-orange-50 rounded-lg transition-colors text-sm"
                    >
                      <span className="text-gray-700 font-medium">{variant.size}</span>
                      <span className="font-semibold text-orange-600 text-sm">{formatRupiah(variant.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {cart.length > 0 && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-6 bg-orange-500 text-white rounded-full p-4 shadow-lg active:bg-orange-600 transition-colors z-50 flex items-center gap-2"
        >
          <ShoppingCart className="w-6 h-6" />
          <span className="font-bold text-lg">{totalItems}</span>
        </button>
      )}

      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowCart(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-gray-700" />
                <h2 className="text-lg font-semibold">Pesanan</h2>
                <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">{totalItems}</span>
              </div>
              <button onClick={() => setShowCart(false)} className="text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{item.name}</h4>
                        <p className="text-xs text-gray-500">{item.variant}</p>
                        <p className="text-sm font-semibold text-orange-600 mt-1">{formatRupiah(item.price)}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-500 active:text-red-700 p-1">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-9 h-9 rounded-lg bg-white border-2 border-gray-300 flex items-center justify-center active:bg-gray-100"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <span className="w-10 text-center font-bold text-lg">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-9 h-9 rounded-lg bg-white border-2 border-gray-300 flex items-center justify-center active:bg-gray-100"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="text-base font-bold text-gray-800">{formatRupiah(item.price * item.quantity)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t p-4 bg-white space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Total</span>
                <span className="text-orange-600">{formatRupiah(total)}</span>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full bg-orange-500 active:bg-orange-600 text-white font-semibold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-lg"
              >
                <Receipt className="w-6 h-6" />
                Bayar Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Metode Pembayaran</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 active:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mb-6">
                <div className="bg-orange-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">Total Pembayaran</p>
                  <p className="text-2xl font-bold text-orange-600">{formatRupiah(total)}</p>
                </div>
                <div className="space-y-3">
                  {paymentMethods.map(method => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setSelectedPayment(method.id)}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          selectedPayment === method.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 active:border-orange-200'
                        }`}
                      >
                        <Icon className={`w-7 h-7 ${selectedPayment === method.id ? 'text-orange-600' : 'text-gray-400'}`} />
                        <span className={`font-medium text-base ${selectedPayment === method.id ? 'text-orange-600' : 'text-gray-700'}`}>
                          {method.name}
                        </span>
                        {selectedPayment === method.id && <Check className="w-6 h-6 text-orange-600 ml-auto" />}
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
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {quickCashAmounts.map(amount => (
                      <button
                        key={amount}
                        onClick={() => setCashAmount(amount.toString())}
                        className="px-3 py-3 bg-gray-100 active:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
                      >
                        {formatRupiah(amount)}
                      </button>
                    ))}
                  </div>
                  {cashAmount && parseFloat(cashAmount) >= total && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Kembalian</p>
                      <p className="text-xl font-bold text-green-600">{formatRupiah(parseFloat(cashAmount) - total)}</p>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={processPayment}
                className="w-full bg-orange-500 active:bg-orange-600 text-white font-semibold py-4 rounded-lg transition-colors text-lg"
              >
                Proses Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && currentTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Pembayaran Berhasil!</h3>
                <p className="text-gray-600">Transaksi telah berhasil diproses</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">No. Order</span>
                  <span className="font-semibold">{currentTransaction.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="font-semibold">{formatRupiah(currentTransaction.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pembayaran</span>
                  <span className="font-semibold">{paymentMethods.find(p => p.id === currentTransaction.paymentMethod)?.name}</span>
                </div>
                {currentTransaction.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tunai</span>
                      <span className="font-semibold">{formatRupiah(currentTransaction.cashAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kembalian</span>
                      <span className="font-semibold text-green-600">{formatRupiah(currentTransaction.change)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2 mb-6">
                <button
                  onClick={() => handlePrintReceipt('physical')}
                  className="w-full bg-gray-100 active:bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer className="w-5 h-5" />
                  Cetak Struk Fisik
                </button>
                <button
                  onClick={() => handlePrintReceipt('digital')}
                  className="w-full bg-gray-100 active:bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download Struk Digital
                </button>
              </div>
              <button
                onClick={handleNewOrder}
                className="w-full bg-orange-500 active:bg-orange-600 text-white font-semibold py-4 rounded-lg transition-colors text-lg"
              >
                Pesanan Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}