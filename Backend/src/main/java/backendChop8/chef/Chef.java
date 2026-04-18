package backendChop8.chef;

import jakarta.persistence.*;

@Entity
@Table(name = "chef")
public class Chef {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    private String password;
    private String mobile;
    private String address;
    private String role        = "chef";
    private Double pricePerDay = 0.0;

    // Chef's cooking specialisation e.g. "Indian Chef", "Italian Chef"
    private String specialisation;

    // Stored rating — updated every time a customer submits a rating
    private Double avgRating   = 0.0;
    private int    ratingCount = 0;

    @Column(columnDefinition = "LONGTEXT")
    private String photo;

    // Availability is NOT stored in DB — managed by ChefAvailabilityStore
    @Transient
    private boolean available = false;

    public Long    getId()                      { return id; }
    public String  getName()                    { return name; }
    public void    setName(String n)            { this.name = n; }
    public String  getEmail()                   { return email; }
    public void    setEmail(String e)           { this.email = e; }
    public String  getPassword()                { return password; }
    public void    setPassword(String p)        { this.password = p; }
    public String  getMobile()                  { return mobile; }
    public void    setMobile(String m)          { this.mobile = m; }
    public String  getAddress()                 { return address; }
    public void    setAddress(String a)         { this.address = a; }
    public String  getRole()                    { return role; }
    public void    setRole(String r)            { this.role = r; }
    public Double  getPricePerDay()             { return pricePerDay; }
    public void    setPricePerDay(Double p)     { this.pricePerDay = p; }
    public String  getSpecialisation()          { return specialisation; }
    public void    setSpecialisation(String s)  { this.specialisation = s; }
    public Double  getAvgRating()               { return avgRating; }
    public void    setAvgRating(Double v)       { this.avgRating = v; }
    public int     getRatingCount()             { return ratingCount; }
    public void    setRatingCount(int v)        { this.ratingCount = v; }
    public String  getPhoto()                   { return photo; }
    public void    setPhoto(String p)           { this.photo = p; }
    public boolean isAvailable()                { return available; }
    public void    setAvailable(boolean a)      { this.available = a; }
}