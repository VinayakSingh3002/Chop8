package backendChop8.repository;

import backendChop8.rating.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface RatingRepository extends JpaRepository<Rating, Long> {

    List<Rating>     findByRateeId(Long rateeId);

    Optional<Rating> findByBookingIdAndRaterId(Long bookingId, Long raterId);

    @Query("SELECT AVG(r.stars) FROM Rating r WHERE r.rateeId = :rateeId")
    Double findAvgStarsByRateeId(Long rateeId);

    @Query("SELECT COUNT(r) FROM Rating r WHERE r.rateeId = :rateeId")
    int findCountByRateeId(Long rateeId);
}