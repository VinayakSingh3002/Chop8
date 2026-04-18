package backendChop8.controller;

import backendChop8.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    // ─── SIGNUP ───────────────────────────────────────────
    // Accepts: { name, email, password, mobile, address, role }
    // role = "customer" → saves to user table
    // role = "chef"     → saves to chef table
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String role  = body.getOrDefault("role", "customer");

        if (authService.emailExists(email, role)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Email already registered"));
        }

        Map<String, Object> saved = authService.register(body);
        return ResponseEntity.ok(Map.of(
                "message", "Account created successfully",
                "userId",  saved.get("userId"),
                "name",    saved.get("name"),
                "role",    saved.get("role")
        ));
    }

    // ─── LOGIN ────────────────────────────────────────────
    // Checks chef table first, then user table
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email    = credentials.get("email");
        String password = credentials.get("password");

        return authService.login(email, password)
                .<ResponseEntity<?>>map(userMap -> ResponseEntity.ok(Map.of(
                        "message", "Login successful",
                        "userId",  userMap.get("userId"),
                        "name",    userMap.get("name"),
                        "email",   userMap.get("email"),
                        "mobile",  userMap.getOrDefault("mobile",  ""),
                        "address", userMap.getOrDefault("address", ""),
                        "role",    userMap.get("role")
                )))
                .orElse(ResponseEntity.status(401)
                        .body(Map.of("error", "Invalid email or password")));
    }
}