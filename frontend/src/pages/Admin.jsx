import React from "react";
import AdminDataLifecycle from "./AdminDataLifecycle";
import AdminArchive from "./AdminArchive";
import AdminUserManagement from "./AdminUserManagement";

export default function Admin() {
  return (
    <div
      className="admin-page-container"
      style={{
        height: "100%",
        overflowY: "auto",
        paddingBottom: 40,
        fontFamily: "sans-serif",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 24 }}>Admin Dashboard</h2>

      {/* Section 1: User Management */}
      <div style={sectionStyle}>
        <AdminUserManagement />
      </div>

      {/* Section 2: Data Lifecycle  DISABLED FOR NOW*/}
      {/* <div style={sectionStyle}>
        <AdminDataLifecycle />
      </div> */}

      {/* Section 3: Archived Browser */}
      {/* <div style={sectionStyle}>
        <AdminArchive />
      </div> */}
    </div>
  );
}

const sectionStyle = {
  marginBottom: 24,
  padding: 24,
  background: "white",
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  border: "1px solid #e5e5e5",
};
