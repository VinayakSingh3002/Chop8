package backendChop8.repository;

import backendChop8.booking.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking>     findByUserId(Long userId);
    List<Booking>     findByChefId(Long chefId);

    Optional<Booking> findByChefIdAndUserIdAndDate(Long chefId, Long userId, String date);

    List<Booking>     findByChefIdAndDate(Long chefId, String date);

    // Returns the highest id ever assigned — used for unique token generation.
    // Using count() would produce duplicate tokens after cancellations/deletions.
    @Query("SELECT MAX(b.id) FROM Booking b")
    Optional<Long> findMaxId();
}