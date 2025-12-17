import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import KasirPage from './KasirPage';
import LaporanPage from './LaporanPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/kasir" replace />} />
        <Route path="/kasir" element={<KasirPage />} />
        <Route path="/laporan" element={<LaporanPage />} />
      </Routes>
    </BrowserRouter>
  );
}