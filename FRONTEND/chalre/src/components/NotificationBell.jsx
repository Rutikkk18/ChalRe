// src/components/NotificationBell.jsx
import { useEffect, useState, useRef } from "react";
import { Bell, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/notificationBell.css";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications/my?page=0&size=5");
      const notifs = res.data || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.readFlag).length);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, readFlag: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const unread = notifications.filter(n => !n.readFlag);
      await Promise.all(unread.map(n => api.post(`/notifications/${n.id}/read`)));
      setNotifications(prev => prev.map(n => ({ ...n, readFlag: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="bell-button"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>Notifications</h3>
            <div className="header-actions">
              {unreadCount > 0 && (
                <button 
                  className="mark-all-read"
                  onClick={markAllAsRead}
                  disabled={loading}
                >
                  Mark all read
                </button>
              )}
              <button
                className="close-dropdown"
                onClick={() => setShowDropdown(false)}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="dropdown-content">
            {notifications.length === 0 ? (
              <div className="empty-notifications">
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item ${n.readFlag ? "read" : "unread"}`}
                  onClick={() => {
                    if (!n.readFlag) markAsRead(n.id);
                  }}
                >
                  <div className="notification-content">
                    <h4>{n.title}</h4>
                    <p>{n.body}</p>
                    <span className="notification-time">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {!n.readFlag && <div className="unread-dot"></div>}
                </div>
              ))
            )}
          </div>

          <div className="dropdown-footer">
            <button
              className="view-all-btn"
              onClick={() => {
                setShowDropdown(false);
                navigate("/notifications");
              }}
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
