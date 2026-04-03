package backendChop8.chef;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Holds chef availability purely in memory.
 * No database column, no persistence — resets to "unavailable" on server restart.
 *
 * ConcurrentHashMap makes individual get/put thread-safe, but a read-then-write
 * toggle is NOT atomic on its own. compute() solves this — it locks the key for
 * the entire read-modify-write operation, so two threads toggling the same chef
 * at the same instant always produce the correct alternating result.
 */
@Component
public class ChefAvailabilityStore {

    private final ConcurrentHashMap<Long, Boolean> store = new ConcurrentHashMap<>();

    /** Returns true only if the chef has explicitly toggled themselves available. */
    public boolean isAvailable(Long chefId) {
        return store.getOrDefault(chefId, false);
    }

    /**
     * Atomically flips availability and returns the new value.
     * compute() holds a lock on this key for the entire operation,
     * so concurrent toggles from multiple requests never interfere.
     */
    public boolean toggle(Long chefId) {
        // compute() is atomic per key in ConcurrentHashMap
        Boolean next = store.compute(chefId, (id, current) -> current == null ? true : !current);
        return next;
    }

    /** Explicit setter — useful for tests or admin overrides. */
    public void set(Long chefId, boolean available) {
        store.put(chefId, available);
    }
}