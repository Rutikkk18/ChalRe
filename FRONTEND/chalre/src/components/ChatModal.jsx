// src/components/ChatModal.jsx
import { useEffect, useState, useRef } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import api from "../api/axios";
import "../styles/chatModal.css";

export default function ChatModal({ rideId, otherUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    markAsRead();
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [rideId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chat/ride/${rideId}`);
      setMessages(res.data || []);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const markAsRead = async () => {
    try {
      await api.post(`/chat/ride/${rideId}/read`);
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await api.post("/chat/send", {
        rideId: Number(rideId),
        receiverId: otherUser.id,
        message: newMessage.trim()
      });
      setNewMessage("");
      fetchMessages();
      markAsRead();
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-header">
          <div className="chat-header-info">
            <MessageCircle size={20} />
            <div>
              <h3>{otherUser?.name || "Chat"}</h3>
              <p className="chat-subtitle">Ride Chat</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="chat-messages" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className="empty-chat">
              <MessageCircle size={48} />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSent = msg.sender?.id === otherUser?.id ? false : true;
              return (
                <div
                  key={msg.id}
                  className={`message ${isSent ? "sent" : "received"}`}
                >
                  <div className="message-content">
                    <p>{msg.message}</p>
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSend}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            maxLength={500}
          />
          <button type="submit" disabled={sending || !newMessage.trim()}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
