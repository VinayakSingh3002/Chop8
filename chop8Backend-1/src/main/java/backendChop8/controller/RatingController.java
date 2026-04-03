package backendChop8.controller;

import backendChop8.rating.Rating;
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

@RestController
@CrossOrigin(
    origins = "*",
    allowedHeaders = "*",
    methods = { RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS }
)
@RequestMapping("/api/ratings")
public class RatingController {

    @Autowired private RatingRepository ratingRepository;
    @Autowired private ChefRepository   chefRepository;
    @Autowired private UserRepository   userRepository;

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
            String raterRole = body.getOrDefault("raterRole", "").toString();
            String rateeRole = body.getOrDefault("rateeRole", "").toString();

            if (stars < 1 || stars > 5)
                return ResponseEntity.badRequest().body(Map.of("error", "Stars must be 1–5."));

            if (ratingRepository.findByBookingIdAndRaterId(bookingId, raterId).isPresent())
                return ResponseEntity.badRequest().body(Map.of("error", "You have already rated this booking."));

            // Save the rating row
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

            // ── Update avgRating + ratingCount in the ratee's own table ──
            // This way the chef card and profile always show live stored values
            // without needing a JOIN or separate API call.
            Double avg   = ratingRepository.findAvgStarsByRateeId(rateeId);
            int    count = ratingRepository.findCountByRateeId(rateeId);
            double rounded = avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0;

            if ("chef".equalsIgnoreCase(rateeRole)) {
                chefRepository.findById(rateeId).ifPresent(chef -> {
                    chef.setAvgRating(rounded);
                    chef.setRatingCount(count);
                    chefRepository.save(chef);
                });
            } else {
                userRepository.findById(rateeId).ifPresent(user -> {
                    user.setAvgRating(rounded);
                    user.setRatingCount(count);
                    userRepository.save(user);
                });
            }

            Map<String, Object> res = new HashMap<>();
            res.put("message",    "Rating submitted successfully");
            res.put("stars",      stars);
            res.put("avgRating",  rounded);
            res.put("ratingCount",count);
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── GET /api/ratings/ratee/{rateeId} ──────────────────
    @GetMapping("/ratee/{rateeId}")
    public ResponseEntity<?> getRatingsForRatee(@PathVariable Long rateeId) {
        try {
            List<Rating> ratings = ratingRepository.findByRateeId(rateeId);
            Double avg  = ratingRepository.findAvgStarsByRateeId(rateeId);
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

    // ── GET /api/ratings/booking/{bookingId}/rater/{raterId}
    @GetMapping("/booking/{bookingId}/rater/{raterId}")
    public ResponseEntity<?> checkRated(
            @PathVariable Long bookingId,
            @PathVariable Long raterId) {
        boolean already = ratingRepository.findByBookingIdAndRaterId(bookingId, raterId).isPresent();
        return ResponseEntity.ok(Map.of("alreadyRated", already));
    }
}