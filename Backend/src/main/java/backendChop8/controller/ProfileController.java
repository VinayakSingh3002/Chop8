package backendChop8.controller;

import backendChop8.User.User;
import backendChop8.chef.Chef;
import backendChop8.repository.ChefRepository;
import backendChop8.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {
    RequestMethod.GET, RequestMethod.PUT, RequestMethod.OPTIONS
})
@RequestMapping("/api/profile")
public class ProfileController {

    @Autowired private UserRepository userRepository;
    @Autowired private ChefRepository chefRepository;

    // ── GET /api/profile/{role}/{id} ──────────────────────
    @GetMapping("/{role}/{id}")
    public ResponseEntity<?> getProfile(@PathVariable String role, @PathVariable Long id) {

        if ("chef".equalsIgnoreCase(role)) {
            return chefRepository.findById(id)
                    .<ResponseEntity<?>>map(c -> {
                        Map<String, Object> res = new HashMap<>();
                        res.put("id",             c.getId());
                        res.put("name",           c.getName());
                        res.put("email",          c.getEmail());
                        res.put("mobile",         nvl(c.getMobile()));
                        res.put("address",        nvl(c.getAddress()));
                        res.put("photo",          nvl(c.getPhoto()));
                        res.put("specialisation", nvl(c.getSpecialisation()));
                        res.put("pricePerDay",    c.getPricePerDay() != null ? c.getPricePerDay() : 0.0);
                        res.put("avgRating",      c.getAvgRating()   != null ? c.getAvgRating()   : 0.0);
                        res.put("ratingCount",    c.getRatingCount());
                        res.put("role",           c.getRole());
                        return ResponseEntity.ok(res);
                    })
                    .orElse(ResponseEntity.status(404).body(Map.of("error", "Chef not found")));
        }

        return userRepository.findById(id)
                .<ResponseEntity<?>>map(u -> {
                    Map<String, Object> res = new HashMap<>();
                    res.put("id",          u.getId());
                    res.put("name",        u.getName());
                    res.put("email",       u.getEmail());
                    res.put("mobile",      nvl(u.getMobile()));
                    res.put("address",     nvl(u.getAddress()));
                    res.put("photo",       nvl(u.getPhoto()));
                    res.put("avgRating",   u.getAvgRating()   != null ? u.getAvgRating()   : 0.0);
                    res.put("ratingCount", u.getRatingCount());
                    res.put("role",        u.getRole());
                    return ResponseEntity.ok(res);
                })
                .orElse(ResponseEntity.status(404).body(Map.of("error", "User not found")));
    }

    // ── PUT /api/profile/{role}/{id} ──────────────────────
    @PutMapping("/{role}/{id}")
    public ResponseEntity<?> updateProfile(
            @PathVariable String              role,
            @PathVariable Long                id,
            @RequestBody  Map<String, Object> body) {

        String name           = str(body, "name");
        String mobile         = str(body, "mobile");
        String address        = str(body, "address");
        String photo          = str(body, "photo");
        String specialisation = str(body, "specialisation");

        if ("chef".equalsIgnoreCase(role)) {
            return chefRepository.findById(id)
                    .<ResponseEntity<?>>map(c -> {
                        if (name           != null) c.setName(name);
                        if (mobile         != null) c.setMobile(mobile);
                        if (address        != null) c.setAddress(address);
                        if (photo          != null) c.setPhoto(photo.isBlank() ? null : photo);
                        if (specialisation != null) c.setSpecialisation(specialisation.isBlank() ? null : specialisation);
                        if (body.containsKey("pricePerDay")) {
                            try {
                                double p = Double.parseDouble(body.get("pricePerDay").toString());
                                if (p >= 0) c.setPricePerDay(p);
                            } catch (NumberFormatException ignored) {}
                        }
                        Chef saved = chefRepository.save(c);
                        Map<String, Object> res = new HashMap<>();
                        res.put("message",        "Profile updated successfully");
                        res.put("name",           saved.getName());
                        res.put("mobile",         nvl(saved.getMobile()));
                        res.put("address",        nvl(saved.getAddress()));
                        res.put("photo",          nvl(saved.getPhoto()));
                        res.put("specialisation", nvl(saved.getSpecialisation()));
                        res.put("pricePerDay",    saved.getPricePerDay() != null ? saved.getPricePerDay() : 0.0);
                        res.put("avgRating",      saved.getAvgRating()   != null ? saved.getAvgRating()   : 0.0);
                        res.put("ratingCount",    saved.getRatingCount());
                        return ResponseEntity.ok(res);
                    })
                    .orElse(ResponseEntity.status(404).body(Map.of("error", "Chef not found")));
        }

        return userRepository.findById(id)
                .<ResponseEntity<?>>map(u -> {
                    if (name    != null) u.setName(name);
                    if (mobile  != null) u.setMobile(mobile);
                    if (address != null) u.setAddress(address);
                    if (photo   != null) u.setPhoto(photo.isBlank() ? null : photo);
                    User saved = userRepository.save(u);
                    Map<String, Object> res = new HashMap<>();
                    res.put("message",     "Profile updated successfully");
                    res.put("name",        saved.getName());
                    res.put("mobile",      nvl(saved.getMobile()));
                    res.put("address",     nvl(saved.getAddress()));
                    res.put("photo",       nvl(saved.getPhoto()));
                    res.put("avgRating",   saved.getAvgRating()   != null ? saved.getAvgRating()   : 0.0);
                    res.put("ratingCount", saved.getRatingCount());
                    return ResponseEntity.ok(res);
                })
                .orElse(ResponseEntity.status(404).body(Map.of("error", "User not found")));
    }

    private String nvl(String v) { return v != null ? v : ""; }
    private String str(Map<String, Object> body, String key) {
        return body.containsKey(key) ? body.get(key).toString() : null;
    }
}