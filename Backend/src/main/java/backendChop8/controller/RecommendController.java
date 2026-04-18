package backendChop8.controller;

import backendChop8.chef.Chef;
import backendChop8.rating.Rating;
import backendChop8.repository.ChefRepository;
import backendChop8.repository.RatingRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.logging.Logger;
import java.util.stream.Collectors;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*",
             methods = {RequestMethod.GET, RequestMethod.OPTIONS})
@RequestMapping("/api/recommend")
public class RecommendController {

    private static final Logger log = Logger.getLogger(RecommendController.class.getName());

    // In application.properties:
    //   python.recommend.url=http://localhost:5000/recommend
    @Value("${python.recommend.url:http://localhost:5000/recommend}")
    private String pythonServiceUrl;

    @Autowired private ChefRepository   chefRepository;
    @Autowired private RatingRepository ratingRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── GET /api/recommend/chefs ──────────────────────────
    @GetMapping("/chefs")
    public ResponseEntity<String> getRecommendedChefs() {

        // 1. Load chefs from DB
        List<Chef> chefs;
        try {
            chefs = chefRepository.findAll();
            log.info("[Recommend] " + chefs.size() + " chefs in DB");
        } catch (Exception e) {
            log.severe("[Recommend] DB error: " + e.getMessage());
            return jsonString("{\"ranked\":[],\"fallback\":true,\"message\":\"DB error: " + e.getMessage() + "\"}");
        }

        if (chefs.isEmpty()) {
            log.warning("[Recommend] chef table is empty");
            return jsonString("{\"ranked\":[],\"fallback\":false,\"message\":\"No chefs in database\"}");
        }

        // 2. Build payload for Python (NO photo field)
        List<Map<String, Object>> payload = buildPayload(chefs);

        // 3. Call Python ML service
        try {
            log.info("[Recommend] calling Python at " + pythonServiceUrl);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("chefs", payload);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> pythonResp = restTemplate.postForEntity(
                    pythonServiceUrl, entity, String.class);

            if (pythonResp.getStatusCode().is2xxSuccessful()
                    && pythonResp.getBody() != null) {

                String body = pythonResp.getBody();

                // Validate Python actually returned chefs
                JsonNode parsed = objectMapper.readTree(body);
                if (parsed.has("ranked") && parsed.get("ranked").isArray()
                        && parsed.get("ranked").size() > 0) {

                    log.info("[Recommend] Python returned " + parsed.get("ranked").size() + " ranked chefs");
                    // ── KEY FIX ──────────────────────────────────────────
                    // Return the raw JSON String directly.
                    // Do NOT return the JsonNode object — Spring Boot would
                    // then serialize Jackson's internal metadata fields
                    // (array/nodeType/containerNode/etc.) instead of the
                    // actual JSON content, causing "No chefs found" on the UI.
                    return jsonString(body);
                }
                log.warning("[Recommend] Python returned empty ranked array — using fallback");
            }

        } catch (Exception e) {
            log.warning("[Recommend] Python call failed: " + e.getMessage() + " — using fallback");
        }

        // 4. Fallback — always returns real chefs sorted by avgRating
        log.info("[Recommend] fallback: returning " + chefs.size() + " chefs by star rating");
        return jsonString(buildFallbackJson(chefs));
    }

    // ── GET /api/recommend/debug ──────────────────────────
    @GetMapping("/debug")
    public ResponseEntity<String> debug() {
        try {
            List<Chef> chefs = chefRepository.findAll();
            List<Map<String, Object>> info = new ArrayList<>();
            for (Chef chef : chefs) {
                List<Rating> ratings = safeRatings(chef.getId());
                List<Map<String, Object>> comments = new ArrayList<>();
                for (Rating r : ratings) {
                    Map<String, Object> cm = new HashMap<>();
                    cm.put("stars",   r.getStars());
                    cm.put("comment", r.getComment() != null ? r.getComment() : "(no comment)");
                    comments.add(cm);
                }
                Map<String, Object> item = new HashMap<>();
                item.put("id",          chef.getId());
                item.put("name",        s(chef.getName()));
                item.put("avgRating",   d(chef.getAvgRating()));
                item.put("ratingCount", chef.getRatingCount());
                item.put("ratingsInDB", ratings.size());
                item.put("comments",    comments);
                info.add(item);
            }
            Map<String, Object> out = new HashMap<>();
            out.put("totalChefs",       chefs.size());
            out.put("pythonServiceUrl", pythonServiceUrl);
            out.put("chefs",            info);
            return jsonString(objectMapper.writeValueAsString(out));
        } catch (Exception e) {
            return jsonString("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }

    // ── Helpers ───────────────────────────────────────────

    private List<Map<String, Object>> buildPayload(List<Chef> chefs) {
        List<Map<String, Object>> payload = new ArrayList<>();
        for (Chef chef : chefs) {
            List<Rating> ratings = safeRatings(chef.getId());
            List<Map<String, Object>> reviews = new ArrayList<>();
            for (Rating r : ratings) {
                Map<String, Object> rv = new HashMap<>();
                rv.put("stars",   r.getStars());
                rv.put("comment", r.getComment() != null ? r.getComment() : "");
                reviews.add(rv);
            }
            Map<String, Object> m = new HashMap<>();
            m.put("id",             chef.getId());
            m.put("name",           s(chef.getName()));
            m.put("specialisation", s(chef.getSpecialisation()));
            m.put("pricePerDay",    d(chef.getPricePerDay()));
            m.put("avgRating",      d(chef.getAvgRating()));
            m.put("ratingCount",    chef.getRatingCount());
            m.put("reviews",        reviews);
            payload.add(m);
            log.info("[Recommend] chef [" + chef.getName() + "] → " + reviews.size() + " reviews");
        }
        return payload;
    }

    private String buildFallbackJson(List<Chef> chefs) {
        try {
            List<Map<String, Object>> ranked = chefs.stream()
                    .sorted((a, b) -> Double.compare(d(b.getAvgRating()), d(a.getAvgRating())))
                    .map(chef -> {
                        double score = d(chef.getAvgRating());
                        Map<String, Object> m = new HashMap<>();
                        m.put("id",             chef.getId());
                        m.put("name",           s(chef.getName()));
                        m.put("specialisation", s(chef.getSpecialisation()));
                        m.put("pricePerDay",    d(chef.getPricePerDay()));
                        m.put("avgRating",      score);
                        m.put("ratingCount",    chef.getRatingCount());
                        m.put("recommendScore", score);
                        m.put("recommendLabel", label(score));
                        Map<String, Object> sb = new HashMap<>();
                        sb.put("positive", 0);
                        sb.put("negative", 0);
                        sb.put("neutral",  0);
                        m.put("sentimentBreakdown", sb);
                        return m;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> resp = new HashMap<>();
            resp.put("ranked",   ranked);
            resp.put("fallback", true);
            resp.put("message",  "Python ML offline — showing star-rating order");
            return objectMapper.writeValueAsString(resp);
        } catch (Exception e) {
            return "{\"ranked\":[],\"fallback\":true,\"message\":\"Fallback error: " + e.getMessage() + "\"}";
        }
    }

    private List<Rating> safeRatings(Long chefId) {
        try {
            return ratingRepository.findByRateeId(chefId).stream()
                    .filter(r -> "chef".equalsIgnoreCase(r.getRateeRole()))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    // Returns a ResponseEntity<String> with Content-Type: application/json
    // This is the correct way to return raw JSON strings from Spring Boot
    private ResponseEntity<String> jsonString(String json) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        return new ResponseEntity<>(json, h, HttpStatus.OK);
    }

    private String s(String v)     { return v != null ? v : ""; }
    private double d(Double v)     { return v != null ? v : 0.0; }
    private String label(double s) {
        if (s >= 4.5) return "Highly Recommended";
        if (s >= 3.5) return "Recommended";
        if (s >= 2.5) return "Good";
        if (s >= 1.0) return "Average";
        return "Unrated";
    }
}