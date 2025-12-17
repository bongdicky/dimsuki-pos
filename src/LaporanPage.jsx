import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, ShoppingBag, DollarSign, Download, Calendar, Search } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from './lib/supabase';

export default function LaporanPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('today'); // today, week, month, all
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [filterPeriod, startDate, endDate]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date filters
      const now = new Date();
      if (filterPeriod === 'today') {
        const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        query = query.gte('created_at', todayStart);
      } else if (filterPeriod === 'week') {
        const weekStart = new Date(now.setDate(now.getDate() - 7)).toISOString();
        query = query.gte('created_at', weekStart);
      } else if (filterPeriod === 'month') {
        const monthStart = new Date(now.setDate(now.getDate() - 30)).toISOString();
        query = query.gte('created_at', monthStart);
      } else if (filterPeriod === 'custom' && startDate && endDate) {
        query = query.gte('created_at', new Date(startDate).toISOString())
                     .lte('created_at', new Date(endDate + 'T23:59:59').toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      alert('Gagal memuat data transaksi.');
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Calculate statistics
  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalTransactions = transactions.length;
  const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Calculate daily revenue for chart (last 7 days)
  const getDailyRevenue = () => {
    const dailyData = {};
    const last7Days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days.push(dateStr);
      dailyData[dateStr] = 0;
    }

    transactions.forEach(t => {
      const date = new Date(t.created_at).toISOString().split('T')[0];
      if (dailyData.hasOwnProperty(date)) {
        dailyData[date] += t.total;
      }
    });

    return last7Days.map(date => ({
      date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      revenue: dailyData[date]
    }));
  };

  // Calculate top selling items
  const getTopItems = () => {
    const itemCount = {};
    
    transactions.forEach(t => {
      if (t.items && Array.isArray(t.items)) {
        t.items.forEach(item => {
          const key = `${item.name} (${item.variant})`;
          if (!itemCount[key]) {
            itemCount[key] = { name: key, quantity: 0, revenue: 0 };
          }
          itemCount[key].quantity += item.quantity;
          itemCount[key].revenue += item.price * item.quantity;
        });
      }
    });

    return Object.values(itemCount)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  // Filter transactions by search
  const filteredTransactions = transactions.filter(t => 
    t.order_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Tanggal', 'No. Order', 'Items', 'Total', 'Pembayaran'];
    const rows = filteredTransactions.map(t => [
      new Date(t.created_at).toLocaleString('id-ID'),
      t.order_number,
      t.items.map(item => `${item.name} (${item.variant}) x${item.quantity}`).join('; '),
      t.total,
      t.payment_method
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-penjualan-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const dailyRevenue = getDailyRevenue();
  const topItems = getTopItems();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/kasir')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Laporan Penjualan</h1>
                <p className="text-sm text-gray-600">Dashboard & Analytics</p>
              </div>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span className="hidden md:inline">Export CSV</span>
            </button>
          </div>

          {/* Filter Period */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'week', label: '7 Hari' },
              { id: 'month', label: '30 Hari' },
              { id: 'all', label: 'Semua' },
              { id: 'custom', label: 'Custom' }
            ].map(period => (
              <button
                key={period.id}
                onClick={() => setFilterPeriod(period.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterPeriod === period.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {filterPeriod === 'custom' && (
            <div className="mt-3 flex gap-3">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="self-center text-gray-600">sampai</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Total Pendapatan</p>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{formatRupiah(totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {filterPeriod === 'today' ? 'Hari ini' : filterPeriod === 'week' ? '7 hari terakhir' : filterPeriod === 'month' ? '30 hari terakhir' : 'Total keseluruhan'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Jumlah Transaksi</p>
              <ShoppingBag className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{totalTransactions}</p>
            <p className="text-xs text-gray-500 mt-1">Total pesanan</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 text-sm">Rata-rata Transaksi</p>
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{formatRupiah(avgTransaction)}</p>
            <p className="text-xs text-gray-500 mt-1">Per order</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Pendapatan 7 Hari Terakhir</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => formatRupiah(value)}
                  labelStyle={{ color: '#666' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Items Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Menu Terlaris</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topItems}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'quantity' ? `${value} porsi` : formatRupiah(value),
                    name === 'quantity' ? 'Terjual' : 'Revenue'
                  ]}
                />
                <Bar dataKey="quantity" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Riwayat Transaksi</h3>
              <span className="text-sm text-gray-600">{filteredTransactions.length} transaksi</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari nomor order..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Table for desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pembayaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(transaction.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {transaction.order_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {transaction.items.map((item, idx) => (
                        <div key={idx}>
                          {item.name} ({item.variant}) x{item.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {formatRupiah(transaction.total)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {transaction.payment_method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards for mobile */}
          <div className="md:hidden divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{transaction.order_number}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-orange-600">{formatRupiah(transaction.total)}</p>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {transaction.items.map((item, idx) => (
                    <div key={idx}>
                      • {item.name} ({item.variant}) x{item.quantity}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 capitalize">Pembayaran: {transaction.payment_method}</p>
              </div>
            ))}
          </div>

          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Tidak ada transaksi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}