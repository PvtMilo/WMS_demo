import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import InventoryPage from './pages/InventoryPage.jsx'
import InventorySummary from './pages/InventorySummary.jsx'
import LostItemsPage from './pages/LostItemsPage.jsx'
// import PrintLabelsPage from './pages/PrintLabelsPage.jsx'
import ContainersPage from './pages/ContainersPage.jsx'
import ContainerCheckout from './pages/ContainerCheckout.jsx'
import ContainerCheckIn from './pages/ContainerCheckIn.jsx'
import CheckInList from './pages/CheckInList.jsx'
import CheckoutList from './pages/CheckoutList.jsx'
import SuratJalanPage from './pages/SuratJalanPage.jsx'
import SuratJalanHistory from './pages/SuratJalanHistory.jsx'
import MaintenancePage from './pages/MaintenancePage.jsx'
import EmoneyPage from './pages/EmoneyPage.jsx'
import EmoneyDetail from './pages/EmoneyDetail.jsx'
import EmoneyExpenseForm from './pages/EmoneyExpenseForm.jsx'
import EmoneyContainerHistory from './pages/EmoneyContainerHistory.jsx'
import EmoneyHistoryPage from './pages/EmoneyHistoryPage.jsx'
import AdminDataLifecycle from './pages/AdminDataLifecycle.jsx'
import AdminArchive from './pages/AdminArchive.jsx'
import GeneralCheckIn from './pages/GeneralCheckIn.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      {/* Dashboard layout renders persistent sidebar; children render into content area */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/inventory" element={<Dashboard><InventoryPage /></Dashboard>} />
      <Route path="/inventory/summary" element={<Dashboard><InventorySummary /></Dashboard>} />
      <Route path="/inventory/lost" element={<Dashboard><LostItemsPage /></Dashboard>} />
      {/* <Route path="/print-labels" element={<PrintLabelsPage />} /> */}
      <Route path="/containers" element={<Dashboard><ContainersPage /></Dashboard>} />
      <Route path="/checkin" element={<Dashboard><CheckInList /></Dashboard>} />
      <Route path="/checkout" element={<Dashboard><CheckoutList /></Dashboard>} />
      <Route path="/containers/:cid/checkout" element={<Dashboard><ContainerCheckout /></Dashboard>} />
      <Route path="/containers/:cid/checkin" element={<Dashboard><ContainerCheckIn /></Dashboard>} />
      <Route path="/general-checkin" element={<Dashboard><GeneralCheckIn /></Dashboard>} />
      <Route path="/containers/:cid/surat-jalan" element={<Dashboard><SuratJalanPage /></Dashboard>} />
      <Route path="/containers/:cid/surat-jalan/v/:ver" element={<Dashboard><SuratJalanPage /></Dashboard>} />
      <Route path="/containers/:cid/dn-history" element={<Dashboard><SuratJalanHistory /></Dashboard>} />
      <Route path="/maintenance" element={<Dashboard><MaintenancePage /></Dashboard>} />
      <Route path="/emoney" element={<Dashboard><EmoneyPage /></Dashboard>} />
      <Route path="/emoney/history" element={<Dashboard><EmoneyHistoryPage /></Dashboard>} />
      <Route path="/emoney/:id" element={<Dashboard><EmoneyDetail /></Dashboard>} />
      <Route path="/emoney/expense/:cid" element={<Dashboard><EmoneyExpenseForm /></Dashboard>} />
      <Route path="/emoney/history/:cid" element={<Dashboard><EmoneyContainerHistory /></Dashboard>} />
      <Route path="/admin/data-lifecycle" element={<Dashboard><AdminDataLifecycle /></Dashboard>} />
      <Route path="/admin/archive" element={<Dashboard><AdminArchive /></Dashboard>} />
      <Route path="*" element={<div style={{padding:24}}>Not Found</div>} />
    </Routes>
  )
}
