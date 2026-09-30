package br.com.familyctrl.listas;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import br.com.familyctrl.IntegracaoTest;

class ListasEItensTest extends IntegracaoTest {

	private Sessao ana;

	private Sessao intruso;

	private long familiaId;

	@BeforeEach
	void setUp() throws Exception {
		ana = cadastrar("Ana");
		intruso = cadastrar("Intruso");
		familiaId = lerId(mvc.perform(como(ana, post("/api/familias")).content("{\"nome\":\"Casa\"}")).andReturn(),
				"$.id");
		// O intruso tem a própria família, para garantir que ser membro de OUTRA família não basta
		mvc.perform(como(intruso, post("/api/familias")).content("{\"nome\":\"Outra\"}"));
	}

	private long criarLista(String nome) throws Exception {
		return lerId(mvc.perform(como(ana, post("/api/familias/" + familiaId + "/listas"))
			.content("{\"nome\":\"" + nome + "\"}")).andExpect(status().isCreated()).andReturn(), "$.id");
	}

	private long adicionarItem(long listaId, String json) throws Exception {
		return lerId(mvc.perform(como(ana, post("/api/listas/" + listaId + "/itens")).content(json))
			.andExpect(status().isCreated())
			.andReturn(), "$.id");
	}

	@Test
	void criaListaEMostraProgresso() throws Exception {
		long listaId = criarLista("Mercado");
		long arroz = adicionarItem(listaId, "{\"nome\":\"Arroz\",\"quantidade\":\"2 kg\"}");
		adicionarItem(listaId, "{\"nome\":\"Feijão\"}");

		mvc.perform(como(ana, patch("/api/itens/" + arroz)).content("{\"comprado\":true}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.comprado").value(true))
			.andExpect(jsonPath("$.compradoPor.id").value(ana.id()))
			.andExpect(jsonPath("$.compradoPor.nome").value("Ana"));

		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/listas")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$", hasSize(1)))
			.andExpect(jsonPath("$[0].nome").value("Mercado"))
			.andExpect(jsonPath("$[0].totalItens").value(2))
			.andExpect(jsonPath("$[0].itensComprados").value(1));
	}

	@Test
	void itensPendentesAparecemAntesDosComprados() throws Exception {
		long listaId = criarLista("Mercado");
		long primeiro = adicionarItem(listaId, "{\"nome\":\"Primeiro\"}");
		adicionarItem(listaId, "{\"nome\":\"Segundo\"}");
		mvc.perform(como(ana, patch("/api/itens/" + primeiro)).content("{\"comprado\":true}"));

		mvc.perform(como(ana, get("/api/listas/" + listaId)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.itens[0].nome").value("Segundo"))
			.andExpect(jsonPath("$.itens[1].nome").value("Primeiro"));
	}

	@Test
	void desmarcarLimpaQuemComprou() throws Exception {
		long listaId = criarLista("Mercado");
		long item = adicionarItem(listaId, "{\"nome\":\"Leite\"}");
		mvc.perform(como(ana, patch("/api/itens/" + item)).content("{\"comprado\":true}"));

		mvc.perform(como(ana, patch("/api/itens/" + item)).content("{\"comprado\":false}"))
			.andExpect(jsonPath("$.comprado").value(false))
			.andExpect(jsonPath("$.compradoPor").doesNotExist());
	}

	@Test
	void editaERemoveItem() throws Exception {
		long listaId = criarLista("Mercado");
		long item = adicionarItem(listaId, "{\"nome\":\"Leite\",\"quantidade\":\"1\",\"observacao\":\"integral\"}");

		mvc.perform(como(ana, patch("/api/itens/" + item)).content("{\"nome\":\"Leite desnatado\",\"quantidade\":\"\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("Leite desnatado"))
			.andExpect(jsonPath("$.quantidade").doesNotExist())
			.andExpect(jsonPath("$.observacao").value("integral"));

		mvc.perform(como(ana, delete("/api/itens/" + item))).andExpect(status().isNoContent());
		mvc.perform(como(ana, get("/api/listas/" + listaId))).andExpect(jsonPath("$.itens", hasSize(0)));
	}

	@Test
	void limparCompradosRemoveSoOsComprados() throws Exception {
		long listaId = criarLista("Mercado");
		long comprado = adicionarItem(listaId, "{\"nome\":\"Pão\"}");
		adicionarItem(listaId, "{\"nome\":\"Café\"}");
		mvc.perform(como(ana, patch("/api/itens/" + comprado)).content("{\"comprado\":true}"));

		mvc.perform(como(ana, delete("/api/listas/" + listaId + "/itens/comprados")))
			.andExpect(status().isNoContent());

		mvc.perform(como(ana, get("/api/listas/" + listaId)))
			.andExpect(jsonPath("$.itens", hasSize(1)))
			.andExpect(jsonPath("$.itens[0].nome").value("Café"));
	}

	@Test
	void renomeiaArquivaEExcluiLista() throws Exception {
		long listaId = criarLista("Mercado");

		mvc.perform(como(ana, patch("/api/listas/" + listaId)).content("{\"nome\":\"Feira\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("Feira"));

		mvc.perform(como(ana, patch("/api/listas/" + listaId)).content("{\"arquivada\":true}"))
			.andExpect(jsonPath("$.arquivada").value(true));
		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/listas"))).andExpect(jsonPath("$", hasSize(0)));
		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/listas?arquivadas=true")))
			.andExpect(jsonPath("$", hasSize(1)));

		mvc.perform(como(ana, delete("/api/listas/" + listaId))).andExpect(status().isNoContent());
		mvc.perform(como(ana, get("/api/listas/" + listaId))).andExpect(status().isNotFound());
	}

	@Test
	void usuarioDeOutraFamiliaRecebe404EmListasEItens() throws Exception {
		long listaId = criarLista("Mercado");
		long item = adicionarItem(listaId, "{\"nome\":\"Leite\"}");

		mvc.perform(como(intruso, get("/api/familias/" + familiaId + "/listas"))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, post("/api/familias/" + familiaId + "/listas")).content("{\"nome\":\"X\"}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, get("/api/listas/" + listaId))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, patch("/api/listas/" + listaId)).content("{\"nome\":\"X\"}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, delete("/api/listas/" + listaId))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, post("/api/listas/" + listaId + "/itens")).content("{\"nome\":\"X\"}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, delete("/api/listas/" + listaId + "/itens/comprados")))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, patch("/api/itens/" + item)).content("{\"comprado\":true}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, delete("/api/itens/" + item))).andExpect(status().isNotFound());

		// Nada foi alterado
		mvc.perform(como(ana, get("/api/listas/" + listaId)))
			.andExpect(jsonPath("$.nome").value("Mercado"))
			.andExpect(jsonPath("$.itens[0].comprado").value(false));
	}

	@Test
	void membroQueSaiPerdeAcessoAsListas() throws Exception {
		Sessao bia = cadastrar("Bia");
		String codigo = JsonPath.read(
				mvc.perform(como(ana, get("/api/familias/" + familiaId))).andReturn().getResponse().getContentAsString(),
				"$.codigoConvite");
		mvc.perform(como(bia, post("/api/familias/entrar")).content("{\"codigo\":\"" + codigo + "\"}"));
		long listaId = criarLista("Mercado");

		mvc.perform(como(bia, get("/api/listas/" + listaId))).andExpect(status().isOk());
		mvc.perform(como(bia, post("/api/familias/" + familiaId + "/sair"))).andExpect(status().isNoContent());
		mvc.perform(como(bia, get("/api/listas/" + listaId))).andExpect(status().isNotFound());
	}

	@Test
	void validaCamposDoItem() throws Exception {
		long listaId = criarLista("Mercado");
		mvc.perform(como(ana, post("/api/listas/" + listaId + "/itens")).content("{\"nome\":\"\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.erros[0].campo").value("nome"));

		long item = adicionarItem(listaId, "{\"nome\":\"Leite\"}");
		mvc.perform(como(ana, patch("/api/itens/" + item)).content("{\"nome\":\"  \"}"))
			.andExpect(status().isBadRequest());
	}

}
