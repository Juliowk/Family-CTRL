package br.com.familyctrl.sugestoes;

import java.net.http.HttpClient;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import br.com.familyctrl.itens.TipoPreco;

/**
 * Pergunta ao Google Gemini a categoria e a medida de um produto. Chamada REST simples, com o
 * {@link RestClient} do Spring (sem SDK extra). A resposta vem em JSON num formato fixo
 * ({@code responseSchema}), com a categoria restrita às da família.
 *
 * <p>Qualquer problema (sem chave, sem rede, limite do plano gratuito, demora) devolve vazio: a
 * sugestão é uma ajuda, nunca pode travar quem está comprando.
 */
@Component
class ClienteGemini {

	private static final Logger log = LoggerFactory.getLogger(ClienteGemini.class);

	private static final String URL = "https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent";

	record Classificacao(String categoria, TipoPreco medida) {
	}

	private final GeminiProperties propriedades;

	private final RestClient http;

	ClienteGemini(GeminiProperties propriedades) {
		this.propriedades = propriedades;
		var fabrica = new JdkClientHttpRequestFactory(
				HttpClient.newBuilder().connectTimeout(propriedades.tempoMaximo()).build());
		fabrica.setReadTimeout(propriedades.tempoMaximo());
		this.http = RestClient.builder().requestFactory(fabrica).build();
	}

	boolean ativo() {
		return propriedades.ativa();
	}

	/** Categoria (um dos nomes de {@code categorias}) e medida do produto, se a IA responder. */
	Optional<Classificacao> classificar(String produto, List<String> categorias) {
		if (!ativo()) {
			return Optional.empty();
		}
		try {
			String resposta = http.post()
				.uri(URL, propriedades.modelo())
				.header("x-goog-api-key", propriedades.apiKey())
				.contentType(MediaType.APPLICATION_JSON)
				.body(JsonMapper.shared().writeValueAsString(pedido(produto, categorias)))
				.retrieve()
				.body(String.class);
			return lerResposta(resposta, categorias);
		}
		catch (RuntimeException e) {
			// Sem a chave na mensagem: ela vai no header, não na URL
			log.warn("Gemini não classificou o produto: {}", e.getMessage());
			return Optional.empty();
		}
	}

	private static Map<String, Object> pedido(String produto, List<String> categorias) {
		String texto = """
				Classifique um produto de supermercado do Brasil.
				Produto: "%s"
				categoria: escolha exatamente um destes nomes: %s.
				medida: "KG" se o produto costuma ser pesado e pago pelo peso no mercado (carnes, \
				frios fatiados na hora, frutas, legumes e verduras a granel); "UNIDADE" se é vendido \
				em embalagem ou por unidade.""".formatted(produto, String.join("; ", categorias));
		Map<String, Object> esquema = Map.of("type", "OBJECT", "properties",
				Map.of("categoria", Map.of("type", "STRING", "enum", categorias), "medida",
						Map.of("type", "STRING", "enum", List.of("UNIDADE", "KG"))),
				"required", List.of("categoria", "medida"));
		return Map.of("contents", List.of(Map.of("parts", List.of(Map.of("text", texto)))), "generationConfig",
				Map.of("responseMimeType", "application/json", "responseSchema", esquema, "temperature", 0));
	}

	/** Lê a resposta do Gemini; categoria fora da lista ou medida inválida contam como sem resposta. */
	static Optional<Classificacao> lerResposta(String resposta, List<String> categorias) {
		JsonNode texto = JsonMapper.shared()
			.readTree(resposta)
			.path("candidates")
			.path(0)
			.path("content")
			.path("parts")
			.path(0)
			.path("text");
		if (!texto.isString()) {
			return Optional.empty();
		}
		JsonNode json = JsonMapper.shared().readTree(texto.asString());
		String categoria = json.path("categoria").asString("");
		String medida = json.path("medida").asString("");
		if (!categorias.contains(categoria) || !(medida.equals("KG") || medida.equals("UNIDADE"))) {
			return Optional.empty();
		}
		return Optional.of(new Classificacao(categoria, TipoPreco.valueOf(medida)));
	}

}
