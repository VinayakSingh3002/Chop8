package backendChop8.service;

import backendChop8.booking.Booking;
import backendChop8.chef.ChefAvailabilityStore;
import backendChop8.repository.BookingRepository;
import backendChop8.repository.ChefRepository;
import backendChop8.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class BookingService {

    @Autowired private BookingRepository     bookingRepo;
    @Autowired private ChefRepository        chefRepository;
    @Autowired private UserRepository        userRepository;
    @Autowired private ChefAvailabilityStore availabilityStore;

    // ─── Book a chef ──────────────────────────────────────
    public Booking bookChef(Booking booking) {
        Long   userId = booking.getUser().getId();
        Long   chefId = booking.getChef().getId();
        String date   = booking.getDate();

        if (!userRepository.existsById(userId))
            throw new RuntimeException("Only customers can book chefs.");

        backendChop8.chef.Chef chef = chefRepository.findById(chefId)
                .orElseThrow(() -> new RuntimeException("Chef not found."));

        if (!availabilityStore.isAvailable(chefId))
            throw new RuntimeException("This chef is currently not available for booking.");

        List<Booking> dateBookings = getActiveBookingsForDate(chefId, date);
        if (!dateBookings.isEmpty())
            throw new RuntimeException(chef.getName() + " is already booked on " + date + ". Please choose a different date.");

        Optional<Booking> duplicate = bookingRepo.findByChefIdAndUserIdAndDate(chefId, userId, date);
        if (duplicate.isPresent() && "CONFIRMED".equals(duplicate.get().getStatus()))
            throw new RuntimeException("You already have a booking with " + chef.getName() + " on " + date + ". Please cancel it first.");

        String timeIn  = booking.getTimeIn();
        String timeOut = booking.getTimeOut();
        if (timeIn  == null || timeIn.isBlank())  throw new RuntimeException("Please provide a check-in time.");
        if (timeOut == null || timeOut.isBlank())  throw new RuntimeException("Please provide a check-out time.");
        if (timeOut.compareTo(timeIn) <= 0)        throw new RuntimeException("Check-out time must be after check-in time.");

        String mode = booking.getPaymentMode();
        if (mode == null || (!mode.equals("COD") && !mode.equals("ONLINE")))
            throw new RuntimeException("Please select a payment method (COD or ONLINE).");

        long   nextNum = bookingRepo.findMaxId().orElse(0L) + 1;
        String token   = String.format("TKN-%05d", nextNum);
        booking.setTokenId(token);
        booking.setStatus("CONFIRMED");

        if ("COD".equals(mode)) {
            booking.setPaymentStatus("COD");
        }

        return bookingRepo.save(booking);
    }

    // ─── Cancel ───────────────────────────────────────────
    public Booking cancelBooking(Long bookingId) {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));
        booking.setStatus("CANCELLED");
        return bookingRepo.save(booking);
    }

    // ─── Auto-expire ──────────────────────────────────────
    public void releaseExpiredBookings() {
        LocalDateTime now = LocalDateTime.now();
        bookingRepo.findAll().forEach(b -> {
            if (!"CONFIRMED".equals(b.getStatus())) return;
            if (b.getDate() == null) return;
            try {
                LocalDate     date     = LocalDate.parse(b.getDate());
                LocalDateTime expireAt = (b.getTimeOut() != null && !b.getTimeOut().isBlank())
                        ? LocalDateTime.of(date, LocalTime.parse(b.getTimeOut()))
                        : date.plusDays(1).atStartOfDay();
                if (now.isAfter(expireAt)) {
                    b.setStatus("EXPIRED");
                    bookingRepo.save(b);
                }
            } catch (Exception ignored) {}
        });
    }

    // ─── Only CONFIRMED bookings count as busy ────────────
    private List<Booking> getActiveBookingsForDate(Long chefId, String date) {
        return bookingRepo.findByChefIdAndDate(chefId, date)
                .stream()
                .filter(b -> "CONFIRMED".equals(b.getStatus()))
                .collect(Collectors.toList());
    }

    // ─── Busy check ───────────────────────────────────────
    public List<Booking> getBusySlotsForDate(Long chefId, String date) {
        releaseExpiredBookings();
        return getActiveBookingsForDate(chefId, date);
    }

    public List<Booking> getBookingsByUser(Long userId) {
        releaseExpiredBookings();
        return bookingRepo.findByUserId(userId);
    }

    public List<Booking> getBookingsByChef(Long chefId) {
        releaseExpiredBookings();
        return bookingRepo.findByChefId(chefId);
    }
}