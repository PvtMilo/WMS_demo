import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import InventoryPage from './pages/InventoryPage.jsx'
// import PrintLabelsPage from './pages/PrintLabelsPage.jsx'
import ContainersPage from './pages/ContainersPage.jsx'      // NEW
import ContainerCheckout from './pages/ContainerCheckout.jsx'
import ContainerCheckIn from './pages/ContainerCheckIn.jsx'
import CheckInList from './pages/CheckInList.jsx'
import CheckoutList from './pages/CheckoutList.jsx'
import SuratJalanPage from './pages/SuratJalanPage.jsx'
import SuratJalanHistory from './pages/SuratJalanHistory.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/inventory" element={<InventoryPage />} />
      {/* <Route path="/print-labels" element={<PrintLabelsPage />} /> */}
      <Route path="/containers" element={<ContainersPage />} />         {/* NEW */}
      <Route path="/checkin" element={<CheckInList />} />
      <Route path="/checkout" element={<CheckoutList />} />
      <Route path="/containers/:cid/checkout" element={<ContainerCheckout />} />
      <Route path="/containers/:cid/checkin" element={<ContainerCheckIn />} />
      <Route path="/containers/:cid/surat-jalan" element={<SuratJalanPage />} />
      <Route path="/containers/:cid/surat-jalan/v/:ver" element={<SuratJalanPage />} />
      <Route path="/containers/:cid/dn-history" element={<SuratJalanHistory />} />
      <Route path="*" element={<div style={{padding:24}}>Not Found</div>} />
    </Routes>
  )
}
