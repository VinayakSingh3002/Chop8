package backendChop8.repository;

import backendChop8.rating.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RatingRepository extends JpaRepository<Rating, Long> {

    // All ratings received by a person (for profile display)
    List<Rating>     findByRateeId(Long rateeId);

    // All ratings for a specific booking (used by customer-rated endpoint)
    List<Rating>     findByBookingId(Long bookingId);

    // ── KEY FIX: Include raterRole in duplicate check ─────────────────────
    // Without raterRole, chef.id=1 and customer.id=1 would collide:
    // customer rating saved as raterId=1 → chef tries to rate with raterId=1
    // → old query found customer's row → wrongly said "already rated"
    // Now: each role gets its own independent duplicate check
    Optional<Rating> findByBookingIdAndRaterIdAndRaterRole(
            Long bookingId, Long raterId, String raterRole);

    // Check if a specific role has rated a specific booking
    // Used by /booking/{id}/rater/{rid} endpoint
    @Query("SELECT COUNT(r) > 0 FROM Rating r " +
           "WHERE r.bookingId = :bookingId " +
           "AND r.raterId = :raterId " +
           "AND r.raterRole = :raterRole")
    boolean existsByBookingIdAndRaterIdAndRaterRole(
            @Param("bookingId")  Long   bookingId,
            @Param("raterId")    Long   raterId,
            @Param("raterRole")  String raterRole);

    // ── KEY FIX: Include rateeRole in AVG/COUNT queries ───────────────────
    // Without rateeRole, if chef.id=1 and customer.id=1:
    // AVG query returned avg of ALL ratings where rateeId=1
    // mixing chef-as-ratee and customer-as-ratee ratings together
    // Now: each role's rating average is completely independent
    @Query("SELECT AVG(r.stars) FROM Rating r " +
           "WHERE r.rateeId = :rateeId AND r.rateeRole = :rateeRole")
    Double findAvgStarsByRateeIdAndRole(
            @Param("rateeId")   Long   rateeId,
            @Param("rateeRole") String rateeRole);

    @Query("SELECT COUNT(r) FROM Rating r " +
           "WHERE r.rateeId = :rateeId AND r.rateeRole = :rateeRole")
    int findCountByRateeIdAndRole(
            @Param("rateeId")   Long   rateeId,
            @Param("rateeRole") String rateeRole);

    // ── Keep old methods for backward compatibility ───────────────────────
    // (used by getRatingsForRatee endpoint for display only, not for avg calc)
    @Query("SELECT AVG(r.stars) FROM Rating r WHERE r.rateeId = :rateeId")
    Double findAvgStarsByRateeId(@Param("rateeId") Long rateeId);

    @Query("SELECT COUNT(r) FROM Rating r WHERE r.rateeId = :rateeId")
    int findCountByRateeId(@Param("rateeId") Long rateeId);
}