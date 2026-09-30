package br.com.familyctrl.infra.config;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configurações do JWT, lidas de {@code familyctrl.jwt.*}.
 *
 * @param secret           segredo HMAC (mínimo de 32 bytes = 256 bits)
 * @param issuer           emissor gravado e validado no token
 * @param expiracaoPadrao  validade do token sem "lembrar de mim"
 * @param expiracaoLembrar validade do token com "lembrar de mim"
 */
@ConfigurationProperties("familyctrl.jwt")
public record JwtProperties(String secret, String issuer, Duration expiracaoPadrao, Duration expiracaoLembrar) {

	private static final int TAMANHO_MINIMO_BYTES = 32;

	public JwtProperties {
		if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < TAMANHO_MINIMO_BYTES) {
			throw new IllegalStateException(
					"JWT_SECRET ausente ou curto demais: use pelo menos 32 caracteres (256 bits).");
		}
	}

}
