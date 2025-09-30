# Server
HOST = "127.0.0.1"   # kalau mau akses via LAN: "0.0.0.0"
PORT = 5510

# Frontend origin saat dev (untuk CORS)
FRONTEND_ORIGIN = "http://localhost:5173"

# Login plaintext users (HOME SERVER ONLY)
# Roles: 'admin' | 'pic' | 'operator'
USERS = [
    {"email": "admin@wms.ci",   "password": "adminci", "id": "admin", "name": "Admin",         "role": "admin"},
    {"email": "pic@wms.ci",     "password": "picci",   "id": "pic-001","name": "PIC Gudang",    "role": "pic"},
    {"email": "op@wms.ci",      "password": "opci",    "id": "op-001", "name": "Operator",      "role": "operator"},
]

# Backward compatibility (if some code still references ADMIN_*)
ADMIN_EMAIL = USERS[0]["email"]
ADMIN_PASSWORD = USERS[0]["password"]
ADMIN_ID = USERS[0]["id"]
ADMIN_NAME = USERS[0]["name"]
ADMIN_ROLE = USERS[0]["role"].title()
