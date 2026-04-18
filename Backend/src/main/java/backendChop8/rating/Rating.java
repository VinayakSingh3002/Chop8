package backendChop8.rating;

import jakarta.persistence.*;

@Entity
@Table(name = "rating")
public class Rating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long   raterId;
    private String raterName;
    private String raterRole;   // "customer" or "chef"
    private Long   rateeId;
    private String rateeRole;   // "chef" or "customer"
    private int    stars;       // 1–5
    private String comment;
    private Long   bookingId;
    private String createdAt;

    public Long   getId()                 { return id; }
    public Long   getRaterId()            { return raterId; }
    public void   setRaterId(Long v)      { this.raterId = v; }
    public String getRaterName()          { return raterName; }
    public void   setRaterName(String v)  { this.raterName = v; }
    public String getRaterRole()          { return raterRole; }
    public void   setRaterRole(String v)  { this.raterRole = v; }
    public Long   getRateeId()            { return rateeId; }
    public void   setRateeId(Long v)      { this.rateeId = v; }
    public String getRateeRole()          { return rateeRole; }
    public void   setRateeRole(String v)  { this.rateeRole = v; }
    public int    getStars()              { return stars; }
    public void   setStars(int v)         { this.stars = v; }
    public String getComment()            { return comment; }
    public void   setComment(String v)    { this.comment = v; }
    public Long   getBookingId()          { return bookingId; }
    public void   setBookingId(Long v)    { this.bookingId = v; }
    public String getCreatedAt()          { return createdAt; }
    public void   setCreatedAt(String v)  { this.createdAt = v; }
}