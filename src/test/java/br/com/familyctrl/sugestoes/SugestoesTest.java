package br.com.familyctrl.sugestoes;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import br.com.familyctrl.IntegracaoTest;

/** Sugestão de categoria e medida pelo nome. Nos testes a IA fica desligada (sem chave). */
class SugestoesTest extends IntegracaoTest {

	private Sessao ana;

	private long familiaId;

	private String categorias;

	@BeforeEach
	void setUp() throws Exception {
		ana = cadastrar("Ana");
		familiaId = lerId(mvc.perform(como(ana, post("/api/familias")).content("{\"nome\":\"Casa\"}")).andReturn(),
				"$.id");
		categorias = mvc.perform(como(ana, get("/api/familias/" + familiaId + "/categorias")))
			.andReturn()
			.getResponse()
			.getContentAsString();
	}

	private long categoria(String nome) {
		List<Number> ids = JsonPath.read(categorias, "$[?(@.nome == '" + nome + "')].id");
		return ids.getFirst().longValue();
	}

	private String url(String nome) {
		return "/api/familias/" + familiaId + "/sugestao-item?nome=" + nome;
	}

	@Test
	void produtoComumVemDoDicionarioMesmoNoPluralEComMaisPalavras() throws Exception {
		mvc.perform(como(ana, get(url("Mussarelas fatiadas"))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.categoriaId").value(categoria("Laticínios, Frios e Ovos")))
			.andExpect(jsonPath("$.medida").value("KG"))
			.andExpect(jsonPath("$.origem").value("DICIONARIO"));

		// A sequência de palavras mais longa vence: "leite condensado" não é "leite"
		mvc.perform(como(ana, get(url("Leite condensado"))))
			.andExpect(jsonPath("$.categoriaId").value(categoria("Mercearia e Alimentos Básicos")))
			.andExpect(jsonPath("$.medida").value("UNIDADE"));
	}

	@Test
	void historicoDaFamiliaVemAntesDoDicionario() throws Exception {
		long lista = lerId(mvc.perform(como(ana, post("/api/familias/" + familiaId + "/listas"))
			.content("{\"nome\":\"Mercado\"}")).andReturn(), "$.id");
		// A família guarda queijo na padaria, por unidade: é isso que vale para ela
		mvc.perform(como(ana, post("/api/listas/" + lista + "/itens"))
			.content("{\"nome\":\"Queijo\",\"categoriaId\":" + categoria("Padaria") + ",\"medida\":\"UNIDADE\"}"))
			.andExpect(status().isCreated());

		mvc.perform(como(ana, get(url("queijos"))))
			.andExpect(jsonPath("$.categoriaId").value(categoria("Padaria")))
			.andExpect(jsonPath("$.medida").value("UNIDADE"))
			.andExpect(jsonPath("$.origem").value("HISTORICO"));
	}

	@Test
	void desconhecidoSemIaFicaEmOutrosPorUnidade() throws Exception {
		mvc.perform(como(ana, get(url("Xyzabc"))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.categoriaId").value(categoria("Outros")))
			.andExpect(jsonPath("$.medida").value("UNIDADE"))
			.andExpect(jsonPath("$.origem").value("PADRAO"));
	}

	@Test
	void nomeVazioE400EOutraFamiliaE404() throws Exception {
		mvc.perform(como(ana, get(url("  ")))).andExpect(status().isBadRequest());
		Sessao intruso = cadastrar("Intruso");
		mvc.perform(como(intruso, get(url("arroz")))).andExpect(status().isNotFound());
	}

}
