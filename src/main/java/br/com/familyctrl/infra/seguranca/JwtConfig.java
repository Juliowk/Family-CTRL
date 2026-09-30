package br.com.familyctrl.infra.seguranca;

import java.nio.charset.StandardCharsets;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import br.com.familyctrl.infra.config.JwtProperties;

/**
 * Emissão e validação de JWT com HMAC-SHA256 usando o suporte nativo do Spring Security (Nimbus).
 * O mesmo segredo assina (encoder) e verifica (decoder) os tokens.
 */
@Configuration(proxyBeanMethods = false)
class JwtConfig {

	private static SecretKey chave(JwtProperties props) {
		return new SecretKeySpec(props.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
	}

	@Bean
	JwtEncoder jwtEncoder(JwtProperties props) {
		return NimbusJwtEncoder.withSecretKey(chave(props)).algorithm(MacAlgorithm.HS256).build();
	}

	@Bean
	JwtDecoder jwtDecoder(JwtProperties props) {
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(chave(props))
			.macAlgorithm(MacAlgorithm.HS256)
			.build();
		// Valida expiração (padrão) e também o emissor do token
		decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(props.issuer()));
		return decoder;
	}

}
