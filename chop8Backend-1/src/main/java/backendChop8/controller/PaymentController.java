package backendChop8.controller;

import backendChop8.booking.Booking;
import backendChop8.repository.BookingRepository;
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
import java.util.UUID;

@RestController
@CrossOrigin(
    origins = "*",
    allowedHeaders = "*",
    methods = { RequestMethod.POST, RequestMethod.GET, RequestMethod.OPTIONS }
)
@RequestMapping("/api/payment")
public class PaymentController {

    @Autowired
    private BookingRepository bookingRepository;

    // ── POST /api/payment/process ─────────────────────────
    @PostMapping("/process")
    public ResponseEntity<?> processPayment(@RequestBody Map<String, Object> body) {
        try {
            Long   bookingId = Long.parseLong(body.get("bookingId").toString());
            Double amount    = Double.parseDouble(body.get("amount").toString());

            Booking booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

            if ("PAID".equals(booking.getPaymentStatus()))
                return ResponseEntity.badRequest().body(Map.of("error", "This booking has already been paid."));

            if ("CANCELLED".equals(booking.getStatus()) || "EXPIRED".equals(booking.getStatus()))
                return ResponseEntity.badRequest().body(Map.of("error",
                        "Cannot pay for a " + booking.getStatus().toLowerCase() + " booking."));

            // Generate payment ID
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            String paymentId = "TXN-" + timestamp + "-"
                    + UUID.randomUUID().toString().substring(0, 6).toUpperCase();

            // Mark as PAID
            booking.setAmountPaid(amount);
            booking.setPaymentStatus("PAID");
            booking.setPaymentId(paymentId);

            // ── After successful ONLINE payment, expire the booking ──
            // This fulfils the requirement: "after successful payment the token expires"
            booking.setStatus("EXPIRED");

            bookingRepository.save(booking);

            // Build SMS text for display
            String customerName   = booking.getUser() != null ? booking.getUser().getName()   : "Customer";
            String customerMobile = booking.getUser() != null
                    && booking.getUser().getMobile() != null ? booking.getUser().getMobile() : "";
            String chefName       = booking.getChef() != null ? booking.getChef().getName()   : "Chef";
            String paidAt         = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));

            String smsText = "Dear " + customerName
                    + ", your payment of Rs." + amount
                    + " for booking " + booking.getTokenId()
                    + " with Chef " + chefName
                    + " on " + booking.getDate()
                    + " is confirmed. Txn ID: " + paymentId
                    + ". Thank you! - Chop8";

            Map<String, Object> receipt = new HashMap<>();
            receipt.put("success",        true);
            receipt.put("paymentId",      paymentId);
            receipt.put("amountPaid",     amount);
            receipt.put("tokenId",        booking.getTokenId());
            receipt.put("bookingId",      booking.getId());
            receipt.put("chefName",       chefName);
            receipt.put("customerName",   customerName);
            receipt.put("customerMobile", customerMobile);
            receipt.put("date",           booking.getDate());
            receipt.put("timeIn",         booking.getTimeIn()  != null ? booking.getTimeIn()  : "");
            receipt.put("timeOut",        booking.getTimeOut() != null ? booking.getTimeOut() : "");
            receipt.put("paidAt",         paidAt);
            receipt.put("smsText",        smsText);
            receipt.put("message",        "Payment of Rs." + amount + " successful for booking " + booking.getTokenId());

            return ResponseEntity.ok(receipt);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Payment failed: " + e.getMessage()));
        }
    }

    // ── GET /api/payment/user/{userId} ────────────────────
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getPaymentsByUser(@PathVariable Long userId) {
        try {
            List<Booking> paid = bookingRepository.findByUserId(userId)
                    .stream()
                    .filter(b -> "PAID".equals(b.getPaymentStatus()))
                    .toList();
            return ResponseEntity.ok(paid);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}