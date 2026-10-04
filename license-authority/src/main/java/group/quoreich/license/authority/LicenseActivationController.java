package group.quoreich.license.authority;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1")
public class LicenseActivationController {
    private final LicenseAuthorityService service;

    public LicenseActivationController(LicenseAuthorityService service) {
        this.service = service;
    }

    @PostMapping("/activate")
    public Map<String, String> activate(@Valid @RequestBody LicenseActivationRequest request) {
        return Map.of("lease", service.activate(request.licenseKey(), request.fingerprint(), request.environment()));
    }
}
