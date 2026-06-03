import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import InventoryPage from "./pages/Inventory.jsx";
import Goods from "./pages/Goods.jsx";
import InventorySummary from "./pages/StockSummary.jsx";
import UsageReport from "./pages/UsageReport.jsx";
import UsageReportDetail from "./pages/UsageReportDetail.jsx";
import LostItem from "./pages/LostItem.jsx";
import EventsPage from "./pages/Events.jsx";
import EventCheckout from "./pages/EventCheckout.jsx";
import EventCheckIn from "./pages/EventCheckIn.jsx";
import CheckInList from "./pages/CheckInList.jsx";
import CheckoutList from "./pages/CheckoutList.jsx";
import SuratJalan from "./pages/SuratJalan.jsx";
import SuratJalanHistory from "./pages/SuratJalanHistory.jsx";
import Maintenance from "./pages/Maintenance.jsx";
import Emoney from "./pages/Emoney.jsx";
import EmoneyDetail from "./pages/EmoneyDetail.jsx";
import EmoneyExpenseForm from "./pages/EmoneyExpenseForm.jsx";
import EmoneyContainerHistory from "./pages/EmoneyContainerHistory.jsx";
import EmoneyHistory from "./pages/EmoneyHistory.jsx";
import AdminDataLifecycle from "./pages/AdminDataLifecycle.jsx";
import AdminArchive from "./pages/AdminArchive.jsx";
import GeneralCheckIn from "./pages/GeneralCheckIn.jsx";
import Admin from "./pages/Admin.jsx";
import ActivityLog from "./pages/ActivityLog.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      {/* Dashboard layout renders persistent sidebar; children render into content area */}
      <Route path="/dashboard" element={<Dashboard />} />

      <Route
        path="/inventory"
        element={
          <Dashboard>
            <InventoryPage />
          </Dashboard>
        }
      />
      <Route
        path="/goods"
        element={
          <Dashboard>
            <Goods />
          </Dashboard>
        }
      />
      <Route
        path="/reports/usage"
        element={
          <Dashboard>
            <UsageReport />
          </Dashboard>
        }
      />
      <Route
        path="/reports/usage/:cid"
        element={
          <Dashboard>
            <UsageReportDetail />
          </Dashboard>
        }
      />
      <Route
        path="/inventory/summary"
        element={
          <Dashboard>
            <InventorySummary />
          </Dashboard>
        }
      />
      <Route
        path="/inventory/lost"
        element={
          <Dashboard>
            <LostItem />
          </Dashboard>
        }
      />
      <Route
        path="/containers"
        element={
          <Dashboard>
            <EventsPage />
          </Dashboard>
        }
      />
      <Route
        path="/checkin"
        element={
          <Dashboard>
            <CheckInList />
          </Dashboard>
        }
      />
      <Route
        path="/checkout"
        element={
          <Dashboard>
            <CheckoutList />
          </Dashboard>
        }
      />
      <Route
        path="/containers/:cid/checkout"
        element={
          <Dashboard>
            <EventCheckout />
          </Dashboard>
        }
      />
      <Route
        path="/containers/:cid/checkin"
        element={
          <Dashboard>
            <EventCheckIn />
          </Dashboard>
        }
      />
      <Route
        path="/general-checkin"
        element={
          <Dashboard>
            <GeneralCheckIn />
          </Dashboard>
        }
      />
      <Route
        path="/containers/:cid/surat-jalan"
        element={
          <Dashboard>
            <SuratJalan />
          </Dashboard>
        }
      />
      <Route
        path="/containers/:cid/surat-jalan/v/:ver"
        element={
          <Dashboard>
            <SuratJalan />
          </Dashboard>
        }
      />
      <Route
        path="/containers/:cid/dn-history"
        element={
          <Dashboard>
            <SuratJalanHistory />
          </Dashboard>
        }
      />
      <Route
        path="/maintenance"
        element={
          <Dashboard>
            <Maintenance />
          </Dashboard>
        }
      />
      <Route
        path="/emoney"
        element={
          <Dashboard>
            <Emoney />
          </Dashboard>
        }
      />
      <Route
        path="/emoney/history"
        element={
          <Dashboard>
            <EmoneyHistory />
          </Dashboard>
        }
      />
      <Route
        path="/emoney/:id"
        element={
          <Dashboard>
            <EmoneyDetail />
          </Dashboard>
        }
      />
      <Route
        path="/emoney/expense/:cid"
        element={
          <Dashboard>
            <EmoneyExpenseForm />
          </Dashboard>
        }
      />
      <Route
        path="/emoney/history/:cid"
        element={
          <Dashboard>
            <EmoneyContainerHistory />
          </Dashboard>
        }
      />
      <Route
        path="/admin"
        element={
          <Dashboard>
            <Admin />
          </Dashboard>
        }
      />
      <Route
        path="/admin/data-lifecycle"
        element={
          <Dashboard>
            <AdminDataLifecycle />
          </Dashboard>
        }
      />
      <Route
        path="/admin/archive"
        element={
          <Dashboard>
            <AdminArchive />
          </Dashboard>
        }
      />
      <Route
        path="/activity_log"
        element={
          <Dashboard>
            <ActivityLog />
          </Dashboard>
        }
      />

      <Route path="*" element={<div style={{ padding: 24 }}>Not Found</div>} />
    </Routes>
  );
}
