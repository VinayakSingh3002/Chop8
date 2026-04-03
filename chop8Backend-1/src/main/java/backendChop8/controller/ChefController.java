package backendChop8.controller;

import backendChop8.booking.Booking;
import backendChop8.chef.Chef;
import backendChop8.chef.ChefAvailabilityStore;
import backendChop8.repository.BookingRepository;
import backendChop8.repository.ChefRepository;
import backendChop8.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {
    RequestMethod.GET, RequestMethod.POST,
    RequestMethod.PUT, RequestMethod.DELETE,
    RequestMethod.OPTIONS
})
@RequestMapping("/api")
public class ChefController {

    @Autowired private ChefRepository        chefRepo;
    @Autowired private BookingService        bookingService;
    @Autowired private BookingRepository     bookingRepository;
    @Autowired private ChefAvailabilityStore availabilityStore;

    // ── GET /api/chefs ────────────────────────────────────
    @GetMapping("/chefs")
    public List<Chef> getAllChefs() {
        List<Chef> chefs = chefRepo.findAll();
        chefs.forEach(c -> c.setAvailable(availabilityStore.isAvailable(c.getId())));
        return chefs;
    }

    // ── POST /api/book ────────────────────────────────────
    @PostMapping("/book")
    public ResponseEntity<?> bookChef(@RequestBody Booking booking) {
        try {
            return ResponseEntity.ok(bookingService.bookChef(booking));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── PUT /api/chefs/{chefId}/toggle-availability ───────
    // Calls availabilityStore.toggle() directly — returns boolean,
    // no dependency on BookingService return type at all.
    @PutMapping("/chefs/{chefId}/toggle-availability")
    public ResponseEntity<?> toggleAvailability(@PathVariable Long chefId) {
        try {
            // Verify chef exists first
            if (!chefRepo.existsById(chefId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Chef not found."));
            }
            // Toggle in memory store — returns new boolean value
            boolean nowAvailable = availabilityStore.toggle(chefId);
            String  message      = nowAvailable ? "You are now available" : "You are now unavailable";
            return ResponseEntity.ok(Map.of("available", nowAvailable, "message", message));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── GET /api/bookings/chef/{chefId}/busy ──────────────
    @GetMapping("/bookings/chef/{chefId}/busy")
    public ResponseEntity<?> getBusySlots(
            @PathVariable Long   chefId,
            @RequestParam  String date) {
        List<Booking> slots = bookingService.getBusySlotsForDate(chefId, date);
        return ResponseEntity.ok(Map.of("busy", !slots.isEmpty(), "count", slots.size()));
    }

    // ── GET /api/bookings/user/{userId} ───────────────────
    @GetMapping("/bookings/user/{userId}")
    public ResponseEntity<?> getBookingsByUser(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(bookingService.getBookingsByUser(userId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── GET /api/bookings/chef/{chefId} ───────────────────
    @GetMapping("/bookings/chef/{chefId}")
    public ResponseEntity<?> getBookingsByChef(@PathVariable Long chefId) {
        try {
            return ResponseEntity.ok(bookingService.getBookingsByChef(chefId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── DELETE /api/bookings/{bookingId} ──────────────────
    @DeleteMapping("/bookings/{bookingId}")
    public ResponseEntity<?> cancelBooking(@PathVariable Long bookingId) {
        try {
            if (!bookingRepository.existsById(bookingId))
                return ResponseEntity.status(404).body(Map.of("error", "Booking not found: " + bookingId));
            Booking cancelled = bookingService.cancelBooking(bookingId);
            return ResponseEntity.ok(Map.of(
                "message", "Booking cancelled successfully",
                "status",  cancelled.getStatus(),
                "tokenId", cancelled.getTokenId()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Could not cancel: " + e.getMessage()));
        }
    }

    @RequestMapping(value = "/bookings/{bookingId}", method = RequestMethod.OPTIONS)
    public ResponseEntity<?> handleOptions() { return ResponseEntity.ok().build(); }
}