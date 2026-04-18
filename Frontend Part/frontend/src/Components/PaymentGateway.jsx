// src/Components/PaymentGateway.jsx
import React, { useState } from "react";
import { API } from "../config";
function PaymentGateway({ booking, paymentType = "ADVANCE", onSuccess, onClose }) {
  const [step,      setStep]      = useState("form");
  const [card,      setCard]      = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [error,     setError]     = useState("");
  const [receipt,   setReceipt]   = useState(null);
  const [smsCopied, setSmsCopied] = useState(false);

  const isFinal  = paymentType === "FINAL";
  const amount   = isFinal
    ? (booking?.finalAmount   || 0)
    : (booking?.advanceAmount || 0);
  const label    = isFinal ? "Final Payment (70%)" : "Advance Payment (30%)";
  const headerBg = isFinal
    ? "linear-gradient(135deg,#2e7d32,#43a047)"
    : "linear-gradient(135deg,#1e3c72,#2a5298)";

  const handleCardNumber = (e) => {
    const val = e.target.value.replace(/\D/g,"").slice(0,16);
    setCard({ ...card, number: val.match(/.{1,4}/g)?.join(" ") || val });
    setError("");
  };
  const handleExpiry = (e) => {
    let val = e.target.value.replace(/\D/g,"").slice(0,4);
    if (val.length >= 3) val = val.slice(0,2)+"/"+val.slice(2);
    setCard({ ...card, expiry: val }); setError("");
  };

  const handlePay = async () => {
    const raw = card.number.replace(/\s/g,"");
    if (!card.name.trim())        { setError("Please enter cardholder name."); return; }
    if (raw.length !== 16)        { setError("Please enter a valid 16-digit card number."); return; }
    if (card.expiry.length !== 5) { setError("Please enter a valid expiry (MM/YY)."); return; }
    if (card.cvv.length < 3)      { setError("Please enter a valid CVV."); return; }

    setStep("processing");
    setError("");

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 2500));

    try {
      const res  = await fetch(`${API.payment}/process`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId:   booking.id,
          amount,
          paymentType,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Payment failed. Please try again.");
        setStep("form");
        return;
      }

      // ✅ FIX: Set receipt state FIRST, then show success screen,
      // then call onSuccess. This guarantees receipt is populated
      // before the success screen renders and before parent updates.
      setReceipt(data);
      setStep("success");
      // Delay onSuccess slightly so success screen renders first
      // Parent (Orders.jsx) will then refetch booking from backend
      setTimeout(() => {
        if (onSuccess) onSuccess(data);
      }, 100);

    } catch {
      setError("Network error. Please check your connection and try again.");
      setStep("form");
    }
  };

  const handleCopySms = () => {
    if (!receipt?.smsText) return;
    navigator.clipboard.writeText(receipt.smsText)
      .then(() => { setSmsCopied(true); setTimeout(() => setSmsCopied(false), 2500); })
      .catch(() => {});
  };

  // ── Processing screen ─────────────────────────────────
  if (step === "processing") return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ textAlign:"center", padding:"50px 24px" }}>
          <div style={spinnerEl} />
          <h3 style={{ color:"#1e3c72", marginTop:"28px", marginBottom:"8px" }}>Processing {label}...</h3>
          <p style={{ color:"#888", fontSize:"14px", margin:0 }}>Please do not close this window</p>
          <p style={{ color:"#2a5298", fontWeight:700, fontSize:"22px", marginTop:"12px" }}>₹{amount}</p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── Success screen ────────────────────────────────────
  if (step === "success" && receipt) return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth:"480px" }}>
        <div style={{ background:"linear-gradient(135deg,#2e7d32,#43a047)", borderRadius:"14px 14px 0 0", padding:"28px 24px", textAlign:"center", color:"white" }}>
          <div style={{ fontSize:"52px", marginBottom:"6px" }}>✅</div>
          <h2 style={{ margin:0, fontSize:"20px" }}>{receipt.paymentLabel} Successful!</h2>
          <p style={{ margin:"6px 0 0", opacity:0.9, fontSize:"13px" }}>
            ₹{receipt.amountPaid} paid
            {receipt.tokenId ? ` · Token: ${receipt.tokenId}` : ""}
          </p>
        </div>
        <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:"14px" }}>

          {/* Receipt */}
          <div style={receiptBox}>
            <div style={receiptTitle}>🧾 Payment Receipt</div>
            <div style={receiptGrid}>
              <Row label="Payment ID"    value={receipt.paymentId} />
              <Row label="Type"          value={receipt.paymentLabel} />
              {receipt.tokenId && <Row label="Token" value={receipt.tokenId} />}
              <Row label="Chef"          value={receipt.chefName} />
              <Row label="Date"          value={receipt.date} />
              {receipt.timeIn && <Row label="Timings" value={`${receipt.timeIn} – ${receipt.timeOut}`} />}
              <div style={{ gridColumn:"1/-1", borderTop:"1px dashed #ddd", margin:"4px 0" }} />
              <Row label="Chef Charges"  value={`₹${receipt.chefAmount}`} />
              <Row label="Platform Fee"  value={`₹${receipt.platformCharge}`} />
              <Row label="GST (3%)"      value={`₹${receipt.gstAmount}`} />
              <div style={{ gridColumn:"1/-1", borderTop:"1px dashed #ddd", margin:"4px 0" }} />
              <Row label="Total Amount"  value={`₹${receipt.totalAmount}`}  highlight />
              <Row label="Amount Paid"   value={`₹${receipt.amountPaid}`}   highlight />
              {!isFinal && <Row label="Remaining (70%)" value={`₹${receipt.finalAmount}`} />}
              <Row label="Paid At"       value={receipt.paidAt} />
            </div>
          </div>

          {/* SMS */}
          <div style={smsPanel}>
            <div style={{ fontWeight:700, fontSize:"12px", color:"#1b5e20", marginBottom:"8px" }}>
              📱 SMS confirmation text
            </div>
            <div style={smsTextBox}>{receipt.smsText}</div>
            <button onClick={handleCopySms} style={copyBtn}>
              {smsCopied ? "✅ Copied!" : "📋 Copy Message"}
            </button>
          </div>

          {/* Download receipt button */}
          <a
            href={`${API.receipt}/${receipt.bookingId}`}
            download={`Chop8_Receipt_${receipt.tokenId || receipt.bookingId}.txt`}
            style={{ textDecoration:"none" }}
          >
            <button style={downloadBtn}>
              ⬇️ Download Receipt
            </button>
          </a>

          <button onClick={onClose} style={doneBtn}>Done</button>
        </div>
      </div>
    </div>
  );

  // ── Payment form ──────────────────────────────────────
  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ background:headerBg, borderRadius:"14px 14px 0 0", padding:"18px 24px", color:"white" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:"11px", opacity:0.8, marginBottom:"2px" }}>{label}</div>
              <div style={{ fontSize:"24px", fontWeight:700 }}>₹{amount}</div>
            </div>
            <span style={{ fontSize:"26px" }}>💳</span>
          </div>
          <div style={{ marginTop:"6px", fontSize:"12px", opacity:0.8 }}>
            {booking?.tokenId ? `${booking.tokenId} · ` : ""}Chef {booking?.chef?.name}
          </div>
        </div>

        <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:"13px" }}>
          {error && <div style={errBox}>{error}</div>}

          {/* Price summary */}
          <div style={{ background:"#f8fbff", border:"1px solid #e0eafc", borderRadius:"10px", padding:"12px 14px", fontSize:"12px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
              <span style={{ color:"#666" }}>Chef + Platform + GST</span>
              <strong style={{ color:"#1e3c72" }}>₹{booking?.totalAmount || amount}</strong>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", borderTop:"1px dashed #ddd", paddingTop:"6px", marginTop:"6px" }}>
              <span style={{ color: isFinal?"#2e7d32":"#e65100", fontWeight:600 }}>
                {isFinal ? "Final 70% Due Now" : "Advance 30% Due Now"}
              </span>
              <strong style={{ color: isFinal?"#2e7d32":"#e65100", fontSize:"15px" }}>₹{amount}</strong>
            </div>
          </div>

          <div style={fg}>
            <label style={lbl}>Card Number</label>
            <input placeholder="1234 5678 9012 3456" value={card.number} onChange={handleCardNumber} maxLength={19} style={inp} />
          </div>
          <div style={fg}>
            <label style={lbl}>Cardholder Name</label>
            <input placeholder="Name on card" value={card.name}
              onChange={e => { setCard({ ...card, name: e.target.value }); setError(""); }} style={inp} />
          </div>
          <div style={{ display:"flex", gap:"12px" }}>
            <div style={{ ...fg, flex:1 }}>
              <label style={lbl}>Expiry (MM/YY)</label>
              <input placeholder="MM/YY" value={card.expiry} onChange={handleExpiry} maxLength={5} style={inp} />
            </div>
            <div style={{ ...fg, flex:1 }}>
              <label style={lbl}>CVV</label>
              <input placeholder="•••" type="password" value={card.cvv} maxLength={4}
                onChange={e => { setCard({ ...card, cvv: e.target.value.replace(/\D/g,"") }); setError(""); }} style={inp} />
            </div>
          </div>

          <div style={{ display:"flex", gap:"10px" }}>
            <button onClick={handlePay} style={{ ...payBtn, background:headerBg }}>
              🔒 Pay ₹{amount}
            </button>
            <button onClick={onClose} style={cancelBtn}>Cancel</button>
          </div>
          <p style={{ fontSize:"11px", color:"#bbb", textAlign:"center", margin:0 }}>
            🔒 Simulated payment — no real money charged
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <>
      <div style={{ fontSize:"11px", color:"#999", textTransform:"uppercase" }}>{label}</div>
      <div style={{ fontSize:highlight?"14px":"12px", fontWeight:highlight?700:500, color:highlight?"#1e3c72":"#444" }}>{value}</div>
    </>
  );
}

const overlay    = { position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"16px" };
const modal      = { background:"white", borderRadius:"14px", width:"100%", maxWidth:"420px", boxShadow:"0 24px 60px rgba(0,0,0,0.3)", overflow:"hidden", maxHeight:"90vh", overflowY:"auto" };
const fg         = { display:"flex", flexDirection:"column", gap:"4px" };
const lbl        = { fontSize:"11px", fontWeight:600, color:"#666", textTransform:"uppercase" };
const inp        = { padding:"9px 12px", borderRadius:"8px", border:"1px solid #ddd", fontSize:"14px", outline:"none", width:"100%", boxSizing:"border-box" };
const errBox     = { background:"#fff0f0", border:"1px solid #fcc", borderRadius:"8px", padding:"10px 14px", fontSize:"13px", color:"#c00" };
const payBtn     = { flex:1, padding:"12px", color:"white", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"15px", cursor:"pointer" };
const cancelBtn  = { padding:"12px 18px", background:"#f0f0f0", border:"none", borderRadius:"10px", cursor:"pointer", fontSize:"14px" };
const doneBtn    = { width:"100%", padding:"13px", background:"linear-gradient(135deg,#2e7d32,#43a047)", color:"white", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"15px", cursor:"pointer" };
const downloadBtn= { width:"100%", padding:"11px", background:"linear-gradient(135deg,#1e3c72,#2a5298)", color:"white", border:"none", borderRadius:"10px", fontWeight:600, fontSize:"14px", cursor:"pointer", marginBottom:"4px" };
const receiptBox  = { background:"#f8fbff", border:"1px solid #e0eafc", borderRadius:"12px", padding:"14px" };
const receiptTitle= { fontWeight:700, fontSize:"13px", color:"#1e3c72", marginBottom:"10px", textAlign:"center" };
const receiptGrid = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 16px" };
const spinnerEl   = { width:"48px", height:"48px", border:"5px solid #e0eafc", borderTop:"5px solid #2a5298", borderRadius:"50%", animation:"spin 0.9s linear infinite", margin:"0 auto" };
const smsPanel    = { background:"#f1f8e9", border:"1px solid #aed581", borderRadius:"10px", padding:"12px" };
const smsTextBox  = { background:"white", border:"1px solid #c5e1a5", borderRadius:"6px", padding:"10px", fontSize:"12px", color:"#2e7d32", fontFamily:"monospace", wordBreak:"break-word", marginBottom:"8px" };
const copyBtn     = { padding:"7px 16px", background:"linear-gradient(135deg,#558b2f,#7cb342)", color:"white", border:"none", borderRadius:"7px", fontWeight:700, fontSize:"12px", cursor:"pointer" };

export default PaymentGateway;