package br.com.familyctrl.infra.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Origens autorizadas a chamar a API pelo navegador, lidas de
 * {@code familyctrl.cors.allowed-origins} (lista separada por vírgula).
 */
@ConfigurationProperties("familyctrl.cors")
public record CorsProperties(List<String> allowedOrigins) {

	public CorsProperties {
		allowedOrigins = allowedOrigins == null ? List.of()
				: allowedOrigins.stream().map(String::trim).filter(origem -> !origem.isEmpty()).toList();
	}

}
