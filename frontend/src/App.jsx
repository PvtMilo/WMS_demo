import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import InventoryPage from './pages/InventoryPage.jsx'
import PrintLabelsPage from './pages/PrintLabelsPage.jsx'
import ContainersPage from './pages/ContainersPage.jsx'      // NEW
import ContainerDetail from './pages/ContainerDetail.jsx'    // NEW
import CheckInList from './pages/CheckInList.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/print-labels" element={<PrintLabelsPage />} />
      <Route path="/containers" element={<ContainersPage />} />         {/* NEW */}
      <Route path="/checkin" element={<CheckInList />} />
      <Route path="/containers/:cid" element={<ContainerDetail />} />   {/* NEW */}
      <Route path="*" element={<div style={{padding:24}}>Not Found</div>} />
    </Routes>
  )
}