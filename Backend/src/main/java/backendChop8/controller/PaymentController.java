package backendChop8.controller;

import backendChop8.booking.Booking;
import backendChop8.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
            Long   bookingId   = Long.parseLong(body.get("bookingId").toString());
            Double amount      = Double.parseDouble(body.get("amount").toString());
            String paymentType = body.getOrDefault("paymentType", "ADVANCE").toString();

            Booking booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new RuntimeException("Booking not found: " + bookingId));

            if ("CANCELLED".equals(booking.getStatus()))
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot pay for a cancelled booking."));

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            String paymentId = "TXN-" + timestamp + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            String paidAt    = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));

            String customerName   = booking.getUser() != null ? booking.getUser().getName()   : "Customer";
            String customerMobile = booking.getUser() != null && booking.getUser().getMobile() != null
                                    ? booking.getUser().getMobile() : "";
            String chefName       = booking.getChef() != null ? booking.getChef().getName()   : "Chef";

            if ("ADVANCE".equalsIgnoreCase(paymentType)) {
                // ── ADVANCE payment: generate token, confirm booking ──
                if ("PAID".equals(booking.getAdvancePaymentStatus()))
                    return ResponseEntity.badRequest().body(Map.of("error", "Advance payment already completed."));

                // Token generated here — after payment succeeds
                long   nextNum = bookingRepository.findMaxId().orElse(0L) + 1;
                String token   = String.format("TKN-%05d", nextNum);

                booking.setTokenId(token);
                booking.setStatus("CONFIRMED");
                booking.setAdvancePaymentStatus("PAID");
                booking.setAdvancePaymentId(paymentId);
                booking.setAmountPaid(amount);
                booking.setPaymentStatus("ADVANCE_PAID");
                booking.setPaymentId(paymentId);
                bookingRepository.save(booking);

                String smsText = "Dear " + customerName
                        + ", booking CONFIRMED! Token: " + token
                        + ". Advance Rs." + amount + " paid for Chef " + chefName
                        + " on " + booking.getDate()
                        + ". Pay final Rs." + booking.getFinalAmount() + " after service. Txn: " + paymentId + " - Chop8";

                // Build receipt — use local `token` variable to guarantee non-null
                Map<String, Object> receipt = buildReceipt(
                        booking, paymentId, amount, "Advance (30%)", paidAt,
                        smsText, customerName, customerMobile, chefName);
                receipt.put("tokenId", token); // override to ensure fresh token, never null

                return ResponseEntity.ok(receipt);

            } else {
                // ── FINAL payment: close booking ──────────────────────
                if (!"PAID".equals(booking.getAdvancePaymentStatus()))
                    return ResponseEntity.badRequest().body(Map.of("error", "Complete the advance payment first."));

                if ("PAID".equals(booking.getFinalPaymentStatus()))
                    return ResponseEntity.badRequest().body(Map.of("error", "Final payment already completed."));

                booking.setFinalPaymentStatus("PAID");
                booking.setFinalPaymentId(paymentId);
                booking.setPaymentStatus("PAID");
                booking.setAmountPaid(booking.getTotalAmount());
                booking.setStatus("EXPIRED"); // fully paid — token used up
                bookingRepository.save(booking);

                String smsText = "Dear " + customerName
                        + ", final Rs." + amount + " paid for " + booking.getTokenId()
                        + " with Chef " + chefName + " on " + booking.getDate()
                        + ". Total Rs." + booking.getTotalAmount() + ". Txn: " + paymentId + " - Chop8";

                return ResponseEntity.ok(buildReceipt(
                        booking, paymentId, amount, "Final (70%)", paidAt,
                        smsText, customerName, customerMobile, chefName));
            }

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Payment failed: " + e.getMessage()));
        }
    }

    // ── GET /api/payment/receipt/{bookingId} ──────────────
    // Returns plain-text receipt for a booking — used for download
    @GetMapping("/receipt/{bookingId}")
    public ResponseEntity<?> downloadReceipt(@PathVariable Long bookingId) {
        try {
            Booking b = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new RuntimeException("Booking not found"));

            String customerName = b.getUser() != null ? b.getUser().getName() : "Customer";
            String chefName     = b.getChef() != null ? b.getChef().getName() : "Chef";

            StringBuilder sb = new StringBuilder();
            sb.append("======================================\n");
            sb.append("         CHOP8 PAYMENT RECEIPT        \n");
            sb.append("======================================\n\n");
            sb.append("Token ID      : ").append(b.getTokenId() != null ? b.getTokenId() : "—").append("\n");
            sb.append("Customer      : ").append(customerName).append("\n");
            sb.append("Chef          : ").append(chefName).append("\n");
            sb.append("Date          : ").append(b.getDate()).append("\n");
            sb.append("Timings       : ").append(b.getTimeIn()).append(" – ").append(b.getTimeOut()).append("\n");
            sb.append("Payment Mode  : ").append(b.getPaymentMode()).append("\n\n");
            sb.append("--------------------------------------\n");
            sb.append("PRICE BREAKDOWN\n");
            sb.append("--------------------------------------\n");
            sb.append(String.format("Chef Charges  : Rs.%.2f%n", nvl(b.getChefAmount())));
            sb.append(String.format("Platform Fee  : Rs.%.2f%n", nvl(b.getPlatformCharge())));
            sb.append(String.format("GST (3%%)      : Rs.%.2f%n", nvl(b.getGstAmount())));
            sb.append("--------------------------------------\n");
            sb.append(String.format("TOTAL AMOUNT  : Rs.%.2f%n", nvl(b.getTotalAmount())));
            sb.append("--------------------------------------\n");
            sb.append(String.format("Advance (30%%) : Rs.%.2f  [%s]%n",
                    nvl(b.getAdvanceAmount()),
                    "PAID".equals(b.getAdvancePaymentStatus()) ? "PAID" : "PENDING"));
            if (b.getAdvancePaymentId() != null)
                sb.append("Advance Txn   : ").append(b.getAdvancePaymentId()).append("\n");
            sb.append(String.format("Final   (70%%) : Rs.%.2f  [%s]%n",
                    nvl(b.getFinalAmount()),
                    "PAID".equals(b.getFinalPaymentStatus()) ? "PAID" : "PENDING"));
            if (b.getFinalPaymentId() != null)
                sb.append("Final Txn     : ").append(b.getFinalPaymentId()).append("\n");
            sb.append("\n======================================\n");
            sb.append("Thank you for using Chop8!\n");
            sb.append("======================================\n");

            String filename = "Chop8_Receipt_" + (b.getTokenId() != null ? b.getTokenId() : bookingId) + ".txt";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.TEXT_PLAIN)
                    .body(sb.toString());

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── GET /api/payment/user/{userId} ────────────────────
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getPaymentsByUser(@PathVariable Long userId) {
        try {
            List<Booking> paid = bookingRepository.findByUserId(userId)
                    .stream()
                    .filter(b -> "PAID".equals(b.getPaymentStatus())
                              || "ADVANCE_PAID".equals(b.getPaymentStatus()))
                    .toList();
            return ResponseEntity.ok(paid);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Helpers ───────────────────────────────────────────
    private Map<String, Object> buildReceipt(
            Booking b, String paymentId, Double amount,
            String label, String paidAt, String smsText,
            String customerName, String customerMobile, String chefName) {

        Map<String, Object> r = new HashMap<>();
        r.put("success",        true);
        r.put("paymentId",      paymentId);
        r.put("paymentLabel",   label);
        r.put("amountPaid",     amount);
        r.put("tokenId",        b.getTokenId() != null ? b.getTokenId() : "");
        r.put("bookingId",      b.getId());
        r.put("chefName",       chefName);
        r.put("customerName",   customerName);
        r.put("customerMobile", customerMobile);
        r.put("date",           b.getDate() != null ? b.getDate() : "");
        r.put("timeIn",         b.getTimeIn()  != null ? b.getTimeIn()  : "");
        r.put("timeOut",        b.getTimeOut() != null ? b.getTimeOut() : "");
        r.put("chefAmount",     nvl(b.getChefAmount()));
        r.put("platformCharge", nvl(b.getPlatformCharge()));
        r.put("gstAmount",      nvl(b.getGstAmount()));
        r.put("totalAmount",    nvl(b.getTotalAmount()));
        r.put("advanceAmount",  nvl(b.getAdvanceAmount()));
        r.put("finalAmount",    nvl(b.getFinalAmount()));
        r.put("paidAt",         paidAt);
        r.put("smsText",        smsText);
        r.put("message",        label + " payment of Rs." + amount + " successful.");
        return r;
    }

    private double nvl(Double v) { return v != null ? v : 0.0; }
}