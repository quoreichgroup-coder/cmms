package group.quoreich.license.authority;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {
    @GetMapping("/health-check")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
