import { useEffect, useState } from "react";
import api from "../api/axios";
import "../styles/notifications.css";
import { Check, CheckCheck } from "lucide-react";

export default function NotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications/my?page=0&size=50");  // backend route: /api/notifications/my
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, readFlag: true } : n)
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    setMarkingRead(true);
    try {
      const unread = notifications.filter(n => !n.readFlag);
      await Promise.all(unread.map(n => api.post(`/notifications/${n.id}/read`)));
      setNotifications(prev => prev.map(n => ({ ...n, readFlag: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setMarkingRead(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.readFlag).length;

  return (
    <div className="noti-wrapper">
      <div className="noti-header">
        <h2 className="noti-title">Notifications</h2>
        {unreadCount > 0 && (
          <button 
            className="mark-all-read-btn"
            onClick={markAllAsRead}
            disabled={markingRead}
          >
            <CheckCheck size={18} />
            Mark All Read ({unreadCount})
          </button>
        )}
      </div>

      {loading && <p>Loading...</p>}

      {!loading && notifications.length === 0 && (
        <p className="empty">No notifications yet</p>
      )}

      <div className="noti-list">
        {notifications.map((n) => (
          <div 
            className={`noti-item ${n.readFlag ? "read" : "unread"}`} 
            key={n.id}
            onClick={() => {
              if (!n.readFlag) markAsRead(n.id);
            }}
          >
            <div className="noti-texts">
              <div className="noti-header-item">
                <h4>{n.title}</h4>
                {!n.readFlag && (
                  <button
                    className="mark-read-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(n.id);
                    }}
                    title="Mark as read"
                  >
                    <Check size={16} />
                  </button>
                )}
              </div>
              <p>{n.body}</p>
              <span className="time">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
