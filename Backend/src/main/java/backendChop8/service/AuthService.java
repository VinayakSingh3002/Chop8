package backendChop8.service;

import backendChop8.User.User;
import backendChop8.chef.Chef;
import backendChop8.repository.ChefRepository;
import backendChop8.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired private UserRepository userRepository;
    @Autowired private ChefRepository chefRepository;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);

    public boolean emailExists(String email, String role) {
        if ("chef".equalsIgnoreCase(role)) return chefRepository.findByEmail(email).isPresent();
        return userRepository.findByEmail(email).isPresent();
    }

    public Map<String, Object> register(Map<String, String> data) {
        String role        = data.getOrDefault("role", "customer");
        String name        = data.get("name");
        String email       = data.get("email");
        String password    = encoder.encode(data.get("password"));
        String mobile      = data.get("mobile");
        String address     = data.get("address");

        Map<String, Object> result = new HashMap<>();

        if ("chef".equalsIgnoreCase(role)) {
            // Parse pricePerDay — default 0 if not provided or invalid
            double price = 0.0;
            try { price = Double.parseDouble(data.getOrDefault("pricePerDay", "0")); }
            catch (NumberFormatException ignored) {}

            Chef chef = new Chef();
            chef.setName(name);
            chef.setEmail(email);
            chef.setPassword(password);
            chef.setMobile(mobile);
            chef.setAddress(address);
            chef.setRole("chef");
            chef.setPricePerDay(price);
            Chef saved = chefRepository.save(chef);

            result.put("userId",     saved.getId());
            result.put("name",       saved.getName());
            result.put("email",      saved.getEmail());
            result.put("role",       saved.getRole());
            result.put("pricePerDay",saved.getPricePerDay());
        } else {
            User user = new User();
            user.setName(name);
            user.setEmail(email);
            user.setPassword(password);
            user.setMobile(mobile);
            user.setAddress(address);
            user.setRole("customer");
            User saved = userRepository.save(user);

            result.put("userId", saved.getId());
            result.put("name",   saved.getName());
            result.put("email",  saved.getEmail());
            result.put("role",   saved.getRole());
        }

        return result;
    }

    public Optional<Map<String, Object>> login(String email, String rawPassword) {
        // Check chef table first
        Optional<Chef> chef = chefRepository.findByEmail(email);
        if (chef.isPresent() && encoder.matches(rawPassword, chef.get().getPassword())) {
            Map<String, Object> res = new HashMap<>();
            res.put("userId",     chef.get().getId());
            res.put("name",       chef.get().getName());
            res.put("email",      chef.get().getEmail());
            res.put("mobile",     chef.get().getMobile());
            res.put("address",    chef.get().getAddress());
            res.put("role",       chef.get().getRole());
            res.put("pricePerDay",chef.get().getPricePerDay());
            return Optional.of(res);
        }

        // Check user table
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isPresent() && encoder.matches(rawPassword, user.get().getPassword())) {
            Map<String, Object> res = new HashMap<>();
            res.put("userId",  user.get().getId());
            res.put("name",    user.get().getName());
            res.put("email",   user.get().getEmail());
            res.put("mobile",  user.get().getMobile());
            res.put("address", user.get().getAddress());
            res.put("role",    user.get().getRole());
            return Optional.of(res);
        }

        return Optional.empty();
    }
}