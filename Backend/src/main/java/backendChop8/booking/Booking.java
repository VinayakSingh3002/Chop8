package backendChop8.booking;

import backendChop8.User.User;
import backendChop8.chef.Chef;
import jakarta.persistence.*;

@Entity
@Table(name = "booking")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String date;

    // PENDING   — ONLINE booking created, advance not yet paid (no token yet)
    // CONFIRMED — advance paid (ONLINE) OR COD booking
    // EXPIRED   — booking time passed or fully paid online
    // CANCELLED — cancelled by customer
    private String status;

    // tokenId is NULL for ONLINE bookings until advance payment is completed
    // For COD bookings, tokenId is assigned immediately at booking time
    private String tokenId;

    private String timeIn;
    private String timeOut;
    private String paymentMode;     // "COD" | "ONLINE"

    // Price breakdown — stored at booking time
    private Double chefAmount;
    private Double platformCharge;
    private Double gstAmount;
    private Double totalAmount;
    private Double advanceAmount;   // 30% of totalAmount
    private Double finalAmount;     // 70% of totalAmount

    // Split payment tracking
    private String advancePaymentStatus; // null | "PAID"
    private String advancePaymentId;
    private String finalPaymentStatus;   // null | "PAID" | "COD"
    private String finalPaymentId;

    // Cancellation penalty — set when booking is cancelled within 3 hours of start
    // Advance amount is forfeited; this field records how much was deducted
    private Double cancellationPenalty; // amount forfeited (= advanceAmount if late cancel)
    private String cancellationNote;    // human-readable reason shown on the card

    // Legacy fields kept for Payments page compatibility
    private Double amountPaid;
    private String paymentStatus;
    private String paymentId;

    @ManyToOne private Chef chef;
    @ManyToOne private User user;

    public Long   getId()                          { return id; }
    public String getDate()                        { return date; }
    public void   setDate(String d)                { this.date = d; }
    public String getStatus()                      { return status; }
    public void   setStatus(String s)              { this.status = s; }
    public String getTokenId()                     { return tokenId; }
    public void   setTokenId(String t)             { this.tokenId = t; }
    public String getTimeIn()                      { return timeIn; }
    public void   setTimeIn(String t)              { this.timeIn = t; }
    public String getTimeOut()                     { return timeOut; }
    public void   setTimeOut(String t)             { this.timeOut = t; }
    public String getPaymentMode()                 { return paymentMode; }
    public void   setPaymentMode(String m)         { this.paymentMode = m; }
    public Double getChefAmount()                  { return chefAmount; }
    public void   setChefAmount(Double v)          { this.chefAmount = v; }
    public Double getPlatformCharge()              { return platformCharge; }
    public void   setPlatformCharge(Double v)      { this.platformCharge = v; }
    public Double getGstAmount()                   { return gstAmount; }
    public void   setGstAmount(Double v)           { this.gstAmount = v; }
    public Double getTotalAmount()                 { return totalAmount; }
    public void   setTotalAmount(Double v)         { this.totalAmount = v; }
    public Double getAdvanceAmount()               { return advanceAmount; }
    public void   setAdvanceAmount(Double v)       { this.advanceAmount = v; }
    public Double getFinalAmount()                 { return finalAmount; }
    public void   setFinalAmount(Double v)         { this.finalAmount = v; }
    public String getAdvancePaymentStatus()        { return advancePaymentStatus; }
    public void   setAdvancePaymentStatus(String v){ this.advancePaymentStatus = v; }
    public String getAdvancePaymentId()            { return advancePaymentId; }
    public void   setAdvancePaymentId(String v)    { this.advancePaymentId = v; }
    public String getFinalPaymentStatus()          { return finalPaymentStatus; }
    public void   setFinalPaymentStatus(String v)  { this.finalPaymentStatus = v; }
    public String getFinalPaymentId()              { return finalPaymentId; }
    public void   setFinalPaymentId(String v)      { this.finalPaymentId = v; }
    // ── Emergency booking ─────────────────────────────────
    // True when booking is made within EMERGENCY_THRESHOLD_HRS of timeIn
    // on the same day — chef charges 1.5x, shown on token badge
    private boolean isEmergency      = false;
    private Double  emergencySurcharge; // extra amount added due to emergency

    public boolean getIsEmergency()               { return isEmergency; }
    public void    setIsEmergency(boolean v)      { this.isEmergency = v; }
    public Double  getEmergencySurcharge()        { return emergencySurcharge; }
    public void    setEmergencySurcharge(Double v){ this.emergencySurcharge = v; }

    public Double getCancellationPenalty()             { return cancellationPenalty; }
    public void   setCancellationPenalty(Double v)     { this.cancellationPenalty = v; }
    public String getCancellationNote()                { return cancellationNote; }
    public void   setCancellationNote(String v)        { this.cancellationNote = v; }

    public Double getAmountPaid()                  { return amountPaid; }
    public void   setAmountPaid(Double a)          { this.amountPaid = a; }
    public String getPaymentStatus()               { return paymentStatus; }
    public void   setPaymentStatus(String ps)      { this.paymentStatus = ps; }
    public String getPaymentId()                   { return paymentId; }
    public void   setPaymentId(String pid)         { this.paymentId = pid; }
    public Chef   getChef()                        { return chef; }
    public void   setChef(Chef c)                  { this.chef = c; }
    public User   getUser()                        { return user; }
    public void   setUser(User u)                  { this.user = u; }
}