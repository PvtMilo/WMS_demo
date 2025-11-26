import uuid
from db import get_conn, now_iso

def log_activity(user, action, target, details=None):
    """
    Logs an activity to the database.
    user: dict (from request.user) or None (if system action)
    action: str (e.g., "CREATE", "DELETE", "LOGIN")
    target: str (e.g., "Container X", "Item Y")
    details: str (optional extra info)
    """
    try:
        conn = get_conn()
        user_id = user.get("id") if user else "SYSTEM"
        username = user.get("username") if user else "SYSTEM"
        
        conn.execute("""
            INSERT INTO activity_logs (id, user_id, username, action, target, details, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (str(uuid.uuid4()), user_id, username, action, target, details, now_iso()))
        conn.commit()
    except Exception as e:
        print(f"[ERROR] Failed to log activity: {e}")
    finally:
        try:
            conn.close()
        except:
            pass
