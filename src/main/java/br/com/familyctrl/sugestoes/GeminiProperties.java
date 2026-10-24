package br.com.familyctrl.sugestoes;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configurações da IA (Google Gemini), lidas de {@code familyctrl.gemini.*}.
 *
 * @param apiKey chave da API (variável {@code GEMINI_API_KEY}); vazia desliga a IA
 * @param modelo modelo usado; o "-latest" acompanha o modelo leve mais novo do Google
 * @param tempoMaximo quanto esperar a resposta antes de desistir (o item fica com o padrão)
 * @param limitePorHora quantas consultas à IA cada usuário pode fazer por hora
 */
@ConfigurationProperties("familyctrl.gemini")
public record GeminiProperties(String apiKey, String modelo, Duration tempoMaximo, int limitePorHora) {

	public boolean ativa() {
		return apiKey != null && !apiKey.isBlank();
	}

}
