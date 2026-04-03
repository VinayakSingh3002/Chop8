// src/pages/Profile.jsx
import React, { useState, useEffect, useRef } from "react";
import { getUser, fetchProfile, saveProfile, updateLocalUser } from "../services/AuthService";
import { API } from "../config";
import { useNavigate } from "react-router";

// Predefined specialisation options for chefs
const SPECIALISATION_OPTIONS = [
  "Indian Chef", "Italian Chef", "Chinese Chef", "Mexican Chef",
  "Japanese Chef", "Continental Chef", "Dessert Chef", "Healthy Chef",
  "Mughlai Chef", "South Indian Chef", "Bengali Chef", "Gujarati Chef",
  "Multi-Cuisine Chef",
];

function StarDisplay({ avg, count }) {
  const rounded = Math.round(avg || 0);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
      <span style={{ color:"#ffc107", fontSize:"20px", letterSpacing:"2px" }}>
        {"★".repeat(rounded)}{"☆".repeat(5 - rounded)}
      </span>
      <span style={{ fontWeight:700, fontSize:"16px", color:"#1e3c72" }}>
        {avg > 0 ? Number(avg).toFixed(1) : "—"}
      </span>
      <span style={{ fontSize:"13px", color:"#888" }}>
        ({count} {count === 1 ? "review" : "reviews"})
      </span>
    </div>
  );
}

function Profile() {
  const navigate   = useNavigate();
  const fileRef    = useRef(null);
  const loggedUser = getUser();

  const [form, setForm] = useState({
    name: "", mobile: "", address: "", pricePerDay: "", specialisation: "",
  });
  const [photo,        setPhoto]        = useState("");
  const [preview,      setPreview]      = useState("");
  const [ratings,      setRatings]      = useState([]);
  const [avgRating,    setAvgRating]    = useState(0);
  const [ratingCount,  setRatingCount]  = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [success,      setSuccess]      = useState("");
  const [error,        setError]        = useState("");

  const isChef     = loggedUser?.role === "chef";
  const roleColor  = isChef ? "#f7971e" : "#4facfe";
  const roleBg     = isChef ? "#fff8e1" : "#e3f2fd";
  const roleBorder = isChef ? "#ffe082" : "#90caf9";

  useEffect(() => {
    if (!loggedUser) { navigate("/login"); return; }

    fetchProfile(loggedUser.role, loggedUser.userId)
      .then(data => {
        setForm({
          name:           data.name           || "",
          mobile:         data.mobile         || "",
          address:        data.address        || "",
          pricePerDay:    data.pricePerDay != null ? String(data.pricePerDay) : "",
          specialisation: data.specialisation || "",
        });
        setPhoto(data.photo   || "");
        setPreview(data.photo || "");
        setAvgRating(data.avgRating     || 0);
        setRatingCount(data.ratingCount || 0);
        setLoading(false);
      })
      .catch(() => { setError("Could not load profile."); setLoading(false); });

    fetch(`${API.ratings}/ratee/${loggedUser.userId}`)
      .then(r => r.json())
      .then(data => {
        setRatings(Array.isArray(data.ratings) ? data.ratings : []);
        if (data.average) setAvgRating(data.average);
        if (data.count)   setRatingCount(data.count);
      })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSuccess(""); setError("");
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { setError("Photo must be under 1 MB."); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setPhoto(reader.result); setPreview(reader.result); setError(""); };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhoto(""); setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name cannot be empty."); return; }
    if (isChef) {
      const price = parseFloat(form.pricePerDay);
      if (isNaN(price) || price < 0) { setError("Please enter a valid price per day."); return; }
    }
    setSaving(true); setSuccess(""); setError("");
    try {
      const payload = {
        name:    form.name.trim(),
        mobile:  form.mobile.trim(),
        address: form.address.trim(),
        photo,
      };
      if (isChef) {
        payload.pricePerDay    = parseFloat(form.pricePerDay) || 0;
        payload.specialisation = form.specialisation.trim();
      }
      const saved = await saveProfile(loggedUser.role, loggedUser.userId, payload);
      updateLocalUser({
        name:           saved.name,
        mobile:         saved.mobile,
        photo:          saved.photo,
        ...(isChef && {
          pricePerDay:    saved.pricePerDay,
          specialisation: saved.specialisation,
        }),
      });
      setSuccess("Profile saved successfully ✅");
    } catch (err) {
      setError(err.message || "Save failed.");
    } finally { setSaving(false); }
  };

  if (!loggedUser) return null;

  return (
    <div style={pageWrap}>
      <div style={cardSt}>

        {/* Header */}
        <div style={header}>
          <h2 style={{ margin:0, fontSize:"24px", color:"#1e3c72" }}>My Profile</h2>
          <span style={{ ...rolePill, background:roleBg, color:roleColor, border:`1px solid ${roleBorder}` }}>
            {isChef ? "👨‍🍳 Chef" : "👤 Customer"}
          </span>
        </div>

        {loading ? (
          <p style={{ textAlign:"center", color:"#888", padding:"40px 0" }}>Loading profile...</p>
        ) : (
          <>
            {error   && <div style={alertBox("#fff0f0","#fcc","#c00")}>{error}</div>}
            {success && <div style={alertBox("#f0fff0","#b2d8b2","#2a7a2a")}>{success}</div>}

            {/* Rating summary */}
            {ratingCount > 0 && (
              <div style={{ background:"linear-gradient(135deg,#f8fbff,#eef6ff)", border:"1px solid #e0eafc", borderRadius:"12px", padding:"16px 20px", marginBottom:"20px" }}>
                <div style={{ fontSize:"12px", fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"8px" }}>
                  {isChef ? "Your Rating from Customers" : "Your Rating from Chefs"}
                </div>
                <StarDisplay avg={avgRating} count={ratingCount} />
              </div>
            )}

            {/* Photo section */}
            <div style={photoSection}>
              <div style={avatarWrap}>
                {preview
                  ? <img src={preview} alt="Profile" style={avatarImg} />
                  : <div style={avatarPlaceholder}><span style={{ fontSize:"48px" }}>{isChef?"👨‍🍳":"👤"}</span></div>}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoChange} />
                <button onClick={() => fileRef.current?.click()} style={uploadBtn}>📷 {preview?"Change Photo":"Upload Photo"}</button>
                {preview && <button onClick={handleRemovePhoto} style={removeBtn}>🗑 Remove Photo</button>}
                <p style={{ fontSize:"11px", color:"#aaa", margin:0 }}>JPG / PNG · Max 1 MB</p>
              </div>
            </div>

            {/* Form */}
            <div style={formGrid}>
              <div style={fieldGroup}>
                <label style={labelSt}>Full Name</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Your full name" style={inputSt} />
              </div>
              <div style={fieldGroup}>
                <label style={labelSt}>Email <span style={{ color:"#bbb", fontSize:"11px" }}>(cannot be changed)</span></label>
                <input value={loggedUser.email||""} disabled style={{ ...inputSt, background:"#f5f5f5", color:"#999", cursor:"not-allowed" }} />
              </div>
              <div style={fieldGroup}>
                <label style={labelSt}>Mobile Number</label>
                <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="Your mobile number" style={inputSt} />
              </div>

              {/* Chef-only fields */}
              {isChef && (
                <>
                  <div style={fieldGroup}>
                    <label style={labelSt}>Price Per Day (₹) <span style={{ color:"#888", fontSize:"11px", fontWeight:400 }}>shown on your card</span></label>
                    <input name="pricePerDay" type="number" min="0" value={form.pricePerDay} onChange={handleChange} placeholder="e.g. 599" style={inputSt} />
                  </div>

                  {/* Specialisation — full width, dropdown + custom input */}
                  <div style={{ ...fieldGroup, gridColumn:"1 / -1" }}>
                    <label style={labelSt}>
                      Specialisation
                      <span style={{ color:"#888", fontSize:"11px", fontWeight:400, marginLeft:"6px" }}>shown as a badge on your card</span>
                    </label>
                    <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                      {/* Quick-select chips */}
                      <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", width:"100%" }}>
                        {SPECIALISATION_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => { setForm(f => ({ ...f, specialisation: opt })); setSuccess(""); setError(""); }}
                            style={{
                              padding: "5px 12px",
                              borderRadius: "20px",
                              border: `1.5px solid ${form.specialisation === opt ? "#1565c0" : "#ddd"}`,
                              background: form.specialisation === opt ? "#e3f2fd" : "white",
                              color: form.specialisation === opt ? "#1565c0" : "#555",
                              fontSize: "12px",
                              fontWeight: form.specialisation === opt ? 700 : 400,
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {/* Custom input */}
                      <input
                        name="specialisation"
                        value={form.specialisation}
                        onChange={handleChange}
                        placeholder="Or type a custom specialisation..."
                        style={{ ...inputSt, marginTop:"6px" }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ ...fieldGroup, gridColumn:"1 / -1" }}>
                <label style={labelSt}>Address</label>
                <textarea name="address" value={form.address} onChange={handleChange} placeholder="Your address" rows={3} style={{ ...inputSt, resize:"vertical", fontFamily:"inherit" }} />
              </div>
            </div>

            {/* Chef card preview */}
            {isChef && (form.pricePerDay || form.specialisation) && (
              <div style={{ background:"linear-gradient(135deg,#f8fbff,#eef6ff)", border:"1px solid #e0eafc", borderRadius:"12px", padding:"14px 18px", marginBottom:"12px" }}>
                <div style={{ fontSize:"11px", color:"#888", fontWeight:600, textTransform:"uppercase", marginBottom:"8px" }}>Your card will show:</div>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
                  {form.specialisation && (
                    <span style={{ padding:"4px 12px", background:"linear-gradient(135deg,#e3f2fd,#bbdefb)", color:"#1565c0", borderRadius:"20px", fontSize:"13px", fontWeight:700 }}>
                      {form.specialisation}
                    </span>
                  )}
                  {form.pricePerDay && (
                    <span style={{ fontSize:"20px", fontWeight:700, color:"#2a5298" }}>₹{form.pricePerDay} / day</span>
                  )}
                </div>
              </div>
            )}

            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <button onClick={handleSave} disabled={saving} style={{ ...saveBtn, background:saving?"#ccc":`linear-gradient(135deg, ${roleColor}, ${isChef?"#ffd200":"#00c6ff"})`, cursor:saving?"not-allowed":"pointer" }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {/* Ratings received */}
            {ratings.length > 0 && (
              <div style={{ marginTop:"32px" }}>
                <div style={{ fontSize:"14px", fontWeight:700, color:"#1e3c72", marginBottom:"14px", paddingBottom:"10px", borderTop:"1px solid #f0f0f0", paddingTop:"20px" }}>
                  ⭐ Reviews Received ({ratings.length})
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                  {ratings.map(r => (
                    <div key={r.id} style={{ background:"#f8fbff", border:"1px solid #e0eafc", borderRadius:"12px", padding:"14px 16px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"6px" }}>
                        <div>
                          <span style={{ fontWeight:600, fontSize:"14px", color:"#1e3c72" }}>
                            {r.raterRole==="chef"?"👨‍🍳":"👤"} {r.raterName}
                          </span>
                          <span style={{ fontSize:"12px", color:"#aaa", marginLeft:"8px" }}>{r.createdAt}</span>
                        </div>
                        <span style={{ color:"#ffc107", fontSize:"16px", letterSpacing:"2px" }}>
                          {"★".repeat(r.stars)}{"☆".repeat(5-r.stars)}
                        </span>
                      </div>
                      {r.comment && <div style={{ fontSize:"13px", color:"#555", lineHeight:1.5 }}>{r.comment}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const pageWrap       = { minHeight:"100vh", background:"linear-gradient(135deg,#f8fbff,#eef6ff)", display:"flex", justifyContent:"center", alignItems:"flex-start", padding:"50px 20px" };
const cardSt         = { background:"white", borderRadius:"18px", padding:"36px", width:"100%", maxWidth:"640px", boxShadow:"0 8px 30px rgba(0,0,0,0.08)", border:"1px solid #e0eafc" };
const header         = { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px", paddingBottom:"18px", borderBottom:"1px solid #f0f0f0" };
const rolePill       = { padding:"5px 14px", borderRadius:"20px", fontSize:"13px", fontWeight:700 };
const photoSection   = { display:"flex", alignItems:"center", gap:"24px", marginBottom:"24px", padding:"20px", background:"#f8fbff", borderRadius:"12px", border:"1px solid #e0eafc" };
const avatarWrap     = { width:"96px", height:"96px", borderRadius:"50%", overflow:"hidden", flexShrink:0, border:"3px solid #e0eafc", background:"#f0f6ff", display:"flex", alignItems:"center", justifyContent:"center" };
const avatarImg      = { width:"100%", height:"100%", objectFit:"cover" };
const avatarPlaceholder = { width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:"#eef6ff" };
const uploadBtn      = { padding:"8px 16px", background:"linear-gradient(135deg,#4facfe,#00c6ff)", color:"white", border:"none", borderRadius:"8px", fontWeight:600, fontSize:"13px", cursor:"pointer" };
const removeBtn      = { padding:"7px 16px", background:"#fff0f0", color:"#c00", border:"1px solid #fcc", borderRadius:"8px", fontSize:"13px", fontWeight:600, cursor:"pointer" };
const formGrid       = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" };
const fieldGroup     = { display:"flex", flexDirection:"column", gap:"6px" };
const labelSt        = { fontSize:"12px", fontWeight:600, color:"#555", textTransform:"uppercase", letterSpacing:"0.5px" };
const inputSt        = { padding:"10px 12px", borderRadius:"8px", border:"1px solid #ddd", fontSize:"14px", outline:"none", width:"100%", boxSizing:"border-box" };
const saveBtn        = { padding:"11px 32px", color:"white", border:"none", borderRadius:"10px", fontWeight:700, fontSize:"15px" };
const alertBox       = (bg,border,color) => ({ background:bg, border:`1px solid ${border}`, color, borderRadius:"8px", padding:"10px 14px", fontSize:"14px", marginBottom:"16px" });

export default Profile;