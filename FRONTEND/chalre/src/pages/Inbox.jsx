// src/pages/Inbox.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Lock, Search } from "lucide-react";
import api from "../api/axios";
import ChatModal from "../components/ChatModal";
import "../styles/inbox.css";

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatModal, setChatModal] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await api.get("/chat/conversations");
      setConversations(res.data || []);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch conversations when chat modal closes (to update unread counts / last message)
  const handleChatClose = () => {
    setChatModal(null);
    fetchConversations();
  };

  // Format the timestamp for display
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  // Truncate location to first part before comma
  const shortLocation = (full) => {
    if (!full) return "";
    return full.split(",")[0].trim();
  };

  // Truncate message preview
  const truncateMsg = (msg, max = 50) => {
    if (!msg) return "";
    return msg.length > max ? msg.substring(0, max) + "…" : msg;
  };

  const openChat = (conv) => {
    if (conv.chatLocked) return;
    setChatModal({
      rideId: conv.rideId,
      otherUser: {
        id: conv.otherUserId,
        name: conv.otherUserName,
      },
    });
  };

  if (loading) {
    return (
      <div className="inbox-wrapper">
        <div className="inbox-loading">
          <div className="inbox-loading-spinner" />
          Loading conversations…
        </div>
      </div>
    );
  }

  return (
    <div className="inbox-wrapper">
      {/* Header */}
      <div className="inbox-header">
        <h1 className="inbox-title">
          <MessageCircle size={24} className="inbox-title-icon" />
          Messages
        </h1>
        <p className="inbox-subtitle">
          {conversations.length === 0
            ? "Your conversations will appear here"
            : `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Empty State */}
      {conversations.length === 0 ? (
        <div className="inbox-empty">
          <div className="inbox-empty-icon">💬</div>
          <p className="inbox-empty-text">
            No conversations yet. Book or offer a ride to start chatting!
          </p>
          <button
            className="inbox-empty-cta"
            onClick={() => navigate("/search")}
          >
            <Search size={15} />
            Find a Ride
          </button>
        </div>
      ) : (
        /* Conversation List */
        <div className="inbox-list-container">
          <div className="inbox-list">
            {conversations.map((conv) => {
              const hasUnread = conv.unreadCount > 0;
              const cardClass = [
                "inbox-card",
                hasUnread ? "inbox-card--unread" : "",
                conv.chatLocked ? "inbox-card--locked" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={`${conv.rideId}-${conv.otherUserId}`}
                  className={cardClass}
                  onClick={() => openChat(conv)}
                  title={
                    conv.chatLocked
                      ? "Chat locked — ride ended more than 48h ago"
                      : `Chat with ${conv.otherUserName}`
                  }
                >
                  {/* Avatar */}
                  <img
                    className="inbox-avatar"
                    src={conv.otherUserImage || "/profileimage.png"}
                    alt={conv.otherUserName || "User"}
                    onError={(e) => {
                      e.target.src = "/profileimage.png";
                    }}
                  />

                  {/* Body */}
                  <div className="inbox-card-body">
                    {/* Top row: Name + Time */}
                    <div className="inbox-card-top">
                      <span className="inbox-card-name">
                        {conv.otherUserName || "Unknown"}
                      </span>
                      <span className="inbox-card-time">
                        {formatTime(conv.lastMessageTime)}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="inbox-card-route">
                      <span className="inbox-route-dot inbox-route-dot--from" />
                      <span className="inbox-route-text">
                        {shortLocation(conv.rideFrom)}
                      </span>
                      <span className="inbox-route-arrow">→</span>
                      <span className="inbox-route-dot inbox-route-dot--to" />
                      <span className="inbox-route-text">
                        {shortLocation(conv.rideTo)}
                      </span>
                      <span className="inbox-card-date">
                        {conv.rideDate}
                      </span>
                    </div>

                    {/* Message preview + badges */}
                    <div className="inbox-card-preview">
                      <span className="inbox-preview-text">
                        {truncateMsg(conv.lastMessage)}
                      </span>

                      {conv.chatLocked && (
                        <span className="inbox-locked-badge">
                          <Lock size={11} />
                          Locked
                        </span>
                      )}

                      {hasUnread && !conv.chatLocked && (
                        <span className="inbox-unread-badge">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chatModal && (
        <ChatModal
          rideId={chatModal.rideId}
          otherUser={chatModal.otherUser}
          onClose={handleChatClose}
        />
      )}
    </div>
  );
}
