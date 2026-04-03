package backendChop8.chef;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChefAvailabilityStore {

    private final ConcurrentHashMap<Long, Boolean> store = new ConcurrentHashMap<>();

    public boolean isAvailable(Long chefId) {
        return store.getOrDefault(chefId, false);
    }
    public boolean toggle(Long chefId) {
     
        Boolean next = store.compute(chefId, (id, current) -> current == null ? true : !current);
        return next;
    }

    public void set(Long chefId, boolean available) {
        store.put(chefId, available);
    }
}
