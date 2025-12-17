import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from './LoginPage';
import KasirPage from './KasirPage';
import LaporanPage from './LaporanPage';
import ManagementMenuPage from './ManagementMenuPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/kasir" replace />} />
          <Route
            path="/kasir"
            element={
              <ProtectedRoute>
                <KasirPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/laporan"
            element={
              <ProtectedRoute requireOwner={true}>
                <LaporanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/management"
            element={
              <ProtectedRoute requireOwner={true}>
                <ManagementMenuPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}