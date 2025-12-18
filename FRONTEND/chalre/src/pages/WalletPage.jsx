// src/pages/WalletPage.jsx
import { useEffect, useState } from "react";
import api from "../api/axios";
import loadRazorpay from "../utils/loadRazorpay";
import "../styles/wallet.css";
import { Wallet, PlusCircle, IndianRupee, Clock } from "lucide-react";

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  // Fetch wallet balance
  const fetchWallet = async () => {
    try {
      const res = await api.get("/wallet");  // axios baseURL already includes /api
      setBalance((res.data.balance || 0) / 100); // paise → rupee
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch transaction history
  const fetchTransactions = async () => {
    try {
      const res = await api.get("/wallet/transactions");  // axios baseURL already includes /api
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Razorpay add-money handler
  const handleAddMoney = async () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || amountNum < 1) {
      alert("Please enter a minimum amount of ₹1");
      return;
    }
    
    if (amountNum > 100000) {
      alert("Maximum amount per transaction is ₹1,00,000");
      return;
    }

    setLoading(true);

    try {
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        alert("Failed to load Razorpay. Check your internet.");
        return;
      }

      // 1️⃣ Create topup order in backend
      const topup = await api.post("/wallet/topup", {  // axios baseURL already includes /api
        amountPaise: amount * 100,
        idempotencyKey: "key_" + Date.now(),
        provider: "RAZORPAY"
      });

      // 2️⃣ Create Razorpay order
      const orderRes = await api.post("/payment/create-order", {  // axios baseURL already includes /api
        topupId: topup.data.id,
        amount: amount * 100,
      });

      const order = orderRes.data;

      // 3️⃣ Razorpay checkout options
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: "INR",
        name: "Wallet Top-up",
        description: "Add money to wallet",
        order_id: order.razorpayOrderId,

        handler: async function (response) {
          // 4️⃣ Verify payment on backend
          await api.post("/payment/verify", {  // axios baseURL already includes /api
            topupId: topup.data.id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
          });

          alert("Payment successful! ₹" + amount + " added to your wallet.");

          fetchWallet();
          fetchTransactions();
          setAmount("");
          setLoading(false);
        },
        
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }

        
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      let errorMsg = "Payment failed to start.";
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object' && errorData.error) {
          errorMsg = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMsg = errorData;
        }
      }
      alert(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="wallet-wrapper">
      <h2 className="wallet-title">
        <Wallet size={28} /> My Wallet
      </h2>

      <div className="balance-card">
        <h3>Available Balance</h3>
        <div className="balance-amount">₹{balance}</div>
      </div>

      <div className="add-money-card">
        <h3>Add Money</h3>
        <div className="add-row">
          <input
            type="number"
            placeholder="Enter amount ₹"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <button onClick={handleAddMoney} disabled={loading}>
            <PlusCircle /> Add
          </button>
        </div>
      </div>

      {/* TRANSACTION HISTORY */}
      <div className="transaction-card">
        <h3>Transaction History</h3>

        {transactions.length === 0 ? (
          <p className="empty-text">No transactions found.</p>
        ) : (
          <ul className="transaction-list">
            {transactions.map((t) => (
              <li key={t.id} className={`transaction-item ${t.type.toLowerCase()}`}>
                <IndianRupee />

                <span className="amount">₹{t.amount}</span>

                <span className={`type ${t.type.toLowerCase()}`}>
                  {t.type}
                </span>

                <span className="date">
                  <Clock size={14} /> {t.date.substring(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
