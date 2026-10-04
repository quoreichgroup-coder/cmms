package group.quoreich.license.authority;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.Map;

@Component
public class LicenseSigner {
    private final ObjectMapper mapper;
    private final String privateKeyPath;
    private PrivateKey privateKey;

    public LicenseSigner(ObjectMapper mapper,
                         @Value("${license-authority.private-key-path}") String privateKeyPath) {
        this.mapper = mapper;
        this.privateKeyPath = privateKeyPath;
    }

    @PostConstruct
    void loadKey() {
        try {
            String pem = Files.readString(Path.of(privateKeyPath));
            String encoded = pem.replaceAll("-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\\s", "");
            byte[] der = Base64.getDecoder().decode(encoded);
            privateKey = KeyFactory.getInstance("Ed25519").generatePrivate(new PKCS8EncodedKeySpec(der));
        } catch (Exception e) {
            throw new IllegalStateException("A valid Ed25519 PKCS#8 private key is required to start the license authority", e);
        }
    }

    public String sign(Map<String, Object> claims) throws Exception {
        String header = base64Url(mapper.writeValueAsBytes(Map.of("alg", "EdDSA", "typ", "JWT")));
        String payload = base64Url(mapper.writeValueAsBytes(claims));
        String signingInput = header + "." + payload;
        Signature signer = Signature.getInstance("Ed25519");
        signer.initSign(privateKey);
        signer.update(signingInput.getBytes(StandardCharsets.US_ASCII));
        return signingInput + "." + base64Url(signer.sign());
    }

    private static String base64Url(byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }
}
