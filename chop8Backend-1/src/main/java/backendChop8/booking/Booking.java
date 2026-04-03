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
    private String status;        
    private String tokenId;
    private String timeIn;
    private String timeOut;

    private String paymentMode;   
    private Double amountPaid;
    private String paymentStatus; 
    private String paymentId;

    @ManyToOne
    private Chef chef;

    @ManyToOne
    private User user;

    public Long   getId()                      { return id; }

    public String getDate()                    { return date; }
    public void   setDate(String d)            { this.date = d; }

    public String getStatus()                  { return status; }
    public void   setStatus(String s)          { this.status = s; }

    public String getTokenId()                 { return tokenId; }
    public void   setTokenId(String t)         { this.tokenId = t; }

    public String getTimeIn()                  { return timeIn; }
    public void   setTimeIn(String t)          { this.timeIn = t; }

    public String getTimeOut()                 { return timeOut; }
    public void   setTimeOut(String t)         { this.timeOut = t; }

    public String getPaymentMode()             { return paymentMode; }
    public void   setPaymentMode(String m)     { this.paymentMode = m; }

    public Double getAmountPaid()              { return amountPaid; }
    public void   setAmountPaid(Double a)      { this.amountPaid = a; }

    public String getPaymentStatus()           { return paymentStatus; }
    public void   setPaymentStatus(String ps)  { this.paymentStatus = ps; }

    public String getPaymentId()               { return paymentId; }
    public void   setPaymentId(String pid)     { this.paymentId = pid; }

    public Chef   getChef()                    { return chef; }
    public void   setChef(Chef c)              { this.chef = c; }

    public User   getUser()                    { return user; }
    public void   setUser(User u)              { this.user = u; }
}
