import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Username dan password harus diisi!');
      return;
    }

    setLoading(true);

    try {
      await login(username, password);
      navigate('/kasir');
    } catch (err) {
      setError(err.message || 'Login gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🥟</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dimsum POS</h1>
          <p className="text-gray-600">Silakan login untuk melanjutkan</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Login</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-3">Akun Demo:</p>
          <div className="space-y-2 text-xs">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-700">Owner</p>
              <p className="text-gray-600">Username: <span className="font-mono">owner</span></p>
              <p className="text-gray-600">Password: <span className="font-mono">admin123</span></p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-700">Kasir Outlet 1</p>
              <p className="text-gray-600">Username: <span className="font-mono">kasir1</span></p>
              <p className="text-gray-600">Password: <span className="font-mono">kasir123</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}