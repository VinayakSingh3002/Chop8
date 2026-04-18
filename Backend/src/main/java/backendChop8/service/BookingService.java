package backendChop8.service;

import backendChop8.booking.Booking;
import backendChop8.chef.Chef;
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

    public static final double PLATFORM_CHARGE      = 49.0;
    public static final double GST_RATE             = 0.03;
    public static final double ADVANCE_PERCENT      = 0.30;
    public static final int    CANCEL_CUTOFF_HRS    = 3;
    // Emergency booking: if booked within this many hours of timeIn on same day
    public static final int    EMERGENCY_THRESHOLD_HRS = 5;
    public static final double EMERGENCY_MULTIPLIER    = 1.5; // chef price × 1.5

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

        Chef chef = chefRepository.findById(chefId)
                .orElseThrow(() -> new RuntimeException("Chef not found."));

        if (!availabilityStore.isAvailable(chefId))
            throw new RuntimeException("This chef is currently not available for booking.");

        List<Booking> dateBookings = getConfirmedBookingsForDate(chefId, date);
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

        // ── Detect emergency booking ──────────────────────
        // Emergency = booked on same day AND timeIn is within EMERGENCY_THRESHOLD_HRS
        boolean emergency = false;
        double  emergencySurcharge = 0.0;

        try {
            LocalDate     today         = LocalDate.now();
            LocalDate     bookingDate   = LocalDate.parse(date);
            LocalDateTime now           = LocalDateTime.now();
            LocalDateTime bookingStart  = LocalDateTime.of(bookingDate, LocalTime.parse(timeIn));
            long          hoursUntilStart = java.time.Duration.between(now, bookingStart).toHours();

            // Same day AND booking starts within threshold hours from now
            if (bookingDate.equals(today) && hoursUntilStart >= 0 && hoursUntilStart <= EMERGENCY_THRESHOLD_HRS) {
                emergency = true;
            }
        } catch (Exception ignored) {}

        // Price breakdown — chef amount × 1.5 if emergency
        double chefAmt     = chef.getPricePerDay() != null ? chef.getPricePerDay() : 0.0;
        double effectiveChefAmt = emergency
                ? Math.round(chefAmt * EMERGENCY_MULTIPLIER * 100.0) / 100.0
                : chefAmt;
        if (emergency) {
            emergencySurcharge = Math.round((effectiveChefAmt - chefAmt) * 100.0) / 100.0;
        }
        double platform = PLATFORM_CHARGE;
        double gst      = Math.round((effectiveChefAmt + platform) * GST_RATE * 100.0) / 100.0;
        double total    = Math.round((effectiveChefAmt + platform + gst) * 100.0) / 100.0;
        double advance  = Math.round(total * ADVANCE_PERCENT * 100.0) / 100.0;
        double finalAmt = Math.round((total - advance) * 100.0) / 100.0;

        booking.setChefAmount(effectiveChefAmt); // stores the actual charged amount
        booking.setPlatformCharge(platform);
        booking.setGstAmount(gst);
        booking.setTotalAmount(total);
        booking.setAdvanceAmount(advance);
        booking.setFinalAmount(finalAmt);
        booking.setIsEmergency(emergency);
        if (emergency) booking.setEmergencySurcharge(emergencySurcharge);

        if ("COD".equals(mode)) {
            long nextNum = bookingRepo.findMaxId().orElse(0L) + 1;
            booking.setTokenId(String.format("TKN-%05d", nextNum));
            booking.setStatus("CONFIRMED");
            booking.setAdvancePaymentStatus("COD");
            booking.setFinalPaymentStatus("COD");
            booking.setPaymentStatus("COD");
        } else {
            // ONLINE: PENDING until advance payment done — token generated after advance
            booking.setTokenId(null);
            booking.setStatus("PENDING");
        }

        return bookingRepo.save(booking);
    }

    // ─── Cancel booking ───────────────────────────────────
    public Booking cancelBooking(Long bookingId) {
        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

        boolean lateCancellation = false;
        if (booking.getDate() != null && booking.getTimeIn() != null) {
            try {
                LocalDateTime bookingStart = LocalDateTime.of(
                        LocalDate.parse(booking.getDate()),
                        LocalTime.parse(booking.getTimeIn()));
                LocalDateTime cutoff = bookingStart.minusHours(CANCEL_CUTOFF_HRS);
                lateCancellation = LocalDateTime.now().isAfter(cutoff);
            } catch (Exception ignored) {}
        }

        booking.setStatus("CANCELLED");

        if (lateCancellation) {
            boolean advancePaid = "PAID".equals(booking.getAdvancePaymentStatus());
            if (advancePaid) {
                double penalty = booking.getAdvanceAmount() != null ? booking.getAdvanceAmount() : 0.0;
                booking.setCancellationPenalty(penalty);
                booking.setCancellationNote(
                    "Late cancellation within " + CANCEL_CUTOFF_HRS + " hours. " +
                    "Advance of \u20b9" + penalty + " is non-refundable."
                );
            } else {
                booking.setCancellationPenalty(0.0);
                booking.setCancellationNote(
                    "Cancelled within " + CANCEL_CUTOFF_HRS + " hours. No advance paid so no deduction."
                );
            }
        }

        return bookingRepo.save(booking);
    }

    // ─── Auto-expire bookings ─────────────────────────────
    //
    // Expiry rules:
    //   PENDING  → never auto-expired (customer may still pay advance)
    //   CONFIRMED + COD → expires after timeOut (COD = fully settled by definition)
    //   CONFIRMED + ONLINE + final NOT paid → NOT expired even if timeOut passed
    //      Reason: customer must pay final 70% before the booking closes.
    //      Token stays active until final payment OR 24 hours after timeOut (grace period).
    //   CONFIRMED + ONLINE + final PAID → PaymentController already sets EXPIRED
    //
    public void releaseExpiredBookings() {
        LocalDateTime now = LocalDateTime.now();
        bookingRepo.findAll().forEach(b -> {

            // Only process CONFIRMED bookings
            if (!"CONFIRMED".equals(b.getStatus())) return;
            if (b.getDate() == null) return;

            try {
                LocalDate     date     = LocalDate.parse(b.getDate());
                LocalDateTime expireAt = (b.getTimeOut() != null && !b.getTimeOut().isBlank())
                        ? LocalDateTime.of(date, LocalTime.parse(b.getTimeOut()))
                        : date.plusDays(1).atStartOfDay();

                // Not yet past timeOut — keep active
                if (!now.isAfter(expireAt)) return;

                boolean isCOD       = "COD".equals(b.getPaymentMode());
                boolean finalPaid   = "PAID".equals(b.getFinalPaymentStatus())
                                   || "PAID".equals(b.getPaymentStatus());

                if (isCOD) {
                    // COD: expire normally after timeOut
                    b.setStatus("EXPIRED");
                    bookingRepo.save(b);

                } else if (finalPaid) {
                    // Online + final already paid: expire normally
                    b.setStatus("EXPIRED");
                    bookingRepo.save(b);

                } else {
                    // Online + final NOT paid yet:
                    // Give 24-hour grace period after timeOut for customer to pay final
                    long hoursAfterExpiry = java.time.Duration.between(expireAt, now).toHours();
                    if (hoursAfterExpiry >= 24) {
                        // 24 hours passed without final payment — expire and forfeit
                        b.setStatus("EXPIRED");
                        bookingRepo.save(b);
                    }
                    // else: keep CONFIRMED — customer can still pay final
                }

            } catch (Exception ignored) {}
        });
    }

    // ─── Helpers ──────────────────────────────────────────
    private List<Booking> getConfirmedBookingsForDate(Long chefId, String date) {
        return bookingRepo.findByChefIdAndDate(chefId, date)
                .stream()
                .filter(b -> "CONFIRMED".equals(b.getStatus()))
                .collect(Collectors.toList());
    }

    public List<Booking> getBusySlotsForDate(Long chefId, String date) {
        releaseExpiredBookings();
        return getConfirmedBookingsForDate(chefId, date);
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