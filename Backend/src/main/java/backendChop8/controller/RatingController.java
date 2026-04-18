package backendChop8.controller;

import backendChop8.booking.Booking;
import backendChop8.rating.Rating;
import backendChop8.repository.BookingRepository;
import backendChop8.repository.ChefRepository;
import backendChop8.repository.RatingRepository;
import backendChop8.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(
    origins = "*",
    allowedHeaders = "*",
    methods = { RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS }
)
@RequestMapping("/api/ratings")
public class RatingController {

    @Autowired private RatingRepository  ratingRepository;
    @Autowired private ChefRepository    chefRepository;
    @Autowired private UserRepository    userRepository;
    @Autowired private BookingRepository bookingRepository;

    // ── POST /api/ratings ─────────────────────────────────
    @PostMapping
    public ResponseEntity<?> submitRating(@RequestBody Map<String, Object> body) {
        try {
            Long   bookingId = Long.parseLong(body.get("bookingId").toString());
            Long   raterId   = Long.parseLong(body.get("raterId").toString());
            Long   rateeId   = Long.parseLong(body.get("rateeId").toString());
            int    stars     = Integer.parseInt(body.get("stars").toString());
            String comment   = body.getOrDefault("comment", "").toString().trim();
            String raterName = body.getOrDefault("raterName", "").toString();
            String raterRole = body.getOrDefault("raterRole", "").toString();  // "customer" or "chef"
            String rateeRole = body.getOrDefault("rateeRole", "").toString();  // "chef" or "customer"

            if (stars < 1 || stars > 5)
                return ResponseEntity.badRequest().body(Map.of("error", "Stars must be 1–5."));

            // ── FIXED: Check duplicate using raterRole too ─────────────
            // Old code: findByBookingIdAndRaterId(bookingId, raterId)
            // Bug: if chef.id == customer.id (both auto-increment from 1),
            // customer's rating was mistakenly found when chef tried to rate.
            // Fix: include raterRole so each side has its own independent slot.
            if (ratingRepository
                    .findByBookingIdAndRaterIdAndRaterRole(bookingId, raterId, raterRole)
                    .isPresent()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "You have already rated this booking."));
            }

            // Save the rating
            Rating rating = new Rating();
            rating.setBookingId(bookingId);
            rating.setRaterId(raterId);
            rating.setRaterName(raterName);
            rating.setRaterRole(raterRole);
            rating.setRateeId(rateeId);
            rating.setRateeRole(rateeRole);
            rating.setStars(stars);
            rating.setComment(comment.isEmpty() ? null : comment);
            rating.setCreatedAt(
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"))
            );
            ratingRepository.save(rating);

            // ── FIXED: Update avgRating using role-aware queries ────────
            // Old code: findAvgStarsByRateeId(rateeId) — no role filter
            // Bug: AVG included ratings from both chef and customer sides
            // if they shared the same numeric ID (separate tables, same counter)
            // Fix: filter by rateeRole so each person's average is independent
            Double avg    = ratingRepository.findAvgStarsByRateeIdAndRole(rateeId, rateeRole);
            int    count  = ratingRepository.findCountByRateeIdAndRole(rateeId, rateeRole);
            double rounded = avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;

            if ("chef".equalsIgnoreCase(rateeRole)) {
                // Customer rated the chef → update chef's avgRating
                chefRepository.findById(rateeId).ifPresent(chef -> {
                    chef.setAvgRating(rounded);
                    chef.setRatingCount(count);
                    chefRepository.save(chef);
                });
            } else {
                // Chef rated the customer → update user's avgRating
                userRepository.findById(rateeId).ifPresent(user -> {
                    user.setAvgRating(rounded);
                    user.setRatingCount(count);
                    userRepository.save(user);
                });
            }

            Map<String, Object> res = new HashMap<>();
            res.put("message",     "Rating submitted successfully");
            res.put("stars",       stars);
            res.put("avgRating",   rounded);
            res.put("ratingCount", count);
            return ResponseEntity.ok(res);

        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error",
                "Invalid data: " + e.getMessage() + ". Please refresh and try again."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── GET /api/ratings/ratee/{rateeId} ──────────────────
    @GetMapping("/ratee/{rateeId}")
    public ResponseEntity<?> getRatingsForRatee(@PathVariable Long rateeId) {
        try {
            List<Rating> ratings = ratingRepository.findByRateeId(rateeId);
            Double avg   = ratingRepository.findAvgStarsByRateeId(rateeId);
            int    count = ratingRepository.findCountByRateeId(rateeId);
            Map<String, Object> res = new HashMap<>();
            res.put("ratings", ratings);
            res.put("average", avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
            res.put("count",   count);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── GET /api/ratings/booking/{bookingId}/rater/{raterId}?role={raterRole}
    // Check if a specific rater has already rated a booking.
    // The raterRole query param makes this role-aware so chef and customer
    // each get their own independent "already rated" flag per booking.
    @GetMapping("/booking/{bookingId}/rater/{raterId}")
    public ResponseEntity<?> checkRated(
            @PathVariable Long   bookingId,
            @PathVariable Long   raterId,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String role) {

        boolean already;
        if (role != null && !role.isBlank()) {
            // Role-aware check — preferred path
            already = ratingRepository
                    .findByBookingIdAndRaterIdAndRaterRole(bookingId, raterId, role)
                    .isPresent();
        } else {
            // Fallback: check both roles (backward compat with old calls)
            // Returns true only if THIS raterId rated in ANY role for this booking
            already = ratingRepository.findByBookingId(bookingId).stream()
                    .anyMatch(r -> r.getRaterId() != null && r.getRaterId().equals(raterId));
        }
        return ResponseEntity.ok(Map.of("alreadyRated", already));
    }

    // ── GET /api/ratings/booking/{bookingId}/customer-rated ──
    // Used by chef-side RatingPoller to check if customer already rated
    // and to get the customer's ID safely (avoids b.user.id JSON truncation issue)
    @GetMapping("/booking/{bookingId}/customer-rated")
    public ResponseEntity<?> checkCustomerRated(@PathVariable Long bookingId) {
        List<Rating> ratings = ratingRepository.findByBookingId(bookingId);

        boolean customerRated = ratings.stream()
                .anyMatch(r -> "customer".equalsIgnoreCase(r.getRaterRole()));

        Map<String, Object> res = new HashMap<>();
        res.put("rated", customerRated);

        // Return customer info from booking so chef poller never needs b.user.id
        Optional<Booking> bookingOpt = bookingRepository.findById(bookingId);
        if (bookingOpt.isPresent()) {
            Booking b = bookingOpt.get();
            if (b.getUser() != null) {
                res.put("customerId",   b.getUser().getId());
                res.put("customerName", b.getUser().getName() != null
                        ? b.getUser().getName() : "Customer");
            }
        }
        return ResponseEntity.ok(res);
    }
}