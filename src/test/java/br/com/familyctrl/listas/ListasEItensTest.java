package br.com.familyctrl.listas;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import br.com.familyctrl.IntegracaoTest;

/** Listas, planejamento de itens e compra em andamento (pegar, desmarcar, extras). */
class ListasEItensTest extends IntegracaoTest {

	private Sessao ana;

	private Sessao intruso;

	private long familiaId;

	private long padaria;

	private long outraFamiliaCategoria;

	@BeforeEach
	void setUp() throws Exception {
		ana = cadastrar("Ana");
		intruso = cadastrar("Intruso");
		familiaId = lerId(mvc.perform(como(ana, post("/api/familias")).content("{\"nome\":\"Casa\"}")).andReturn(),
				"$.id");
		padaria = categoria(ana, familiaId, "Padaria");
		// O intruso tem a própria família, para garantir que ser membro de OUTRA família não basta
		long outraFamilia = lerId(
				mvc.perform(como(intruso, post("/api/familias")).content("{\"nome\":\"Outra\"}")).andReturn(), "$.id");
		outraFamiliaCategoria = categoria(intruso, outraFamilia, "Padaria");
	}

	private long categoria(Sessao sessao, long familia, String nome) throws Exception {
		String json = mvc.perform(como(sessao, get("/api/familias/" + familia + "/categorias")))
			.andReturn()
			.getResponse()
			.getContentAsString();
		List<Number> ids = JsonPath.read(json, "$[?(@.nome == '" + nome + "')].id");
		return ids.getFirst().longValue();
	}

	private long criarLista(String nome) throws Exception {
		return lerId(mvc.perform(como(ana, post("/api/familias/" + familiaId + "/listas"))
			.content("{\"nome\":\"" + nome + "\"}")).andExpect(status().isCreated()).andReturn(), "$.id");
	}

	private long adicionarItem(long listaId, String nome) throws Exception {
		return lerId(mvc.perform(como(ana, post("/api/listas/" + listaId + "/itens"))
			.content("{\"nome\":\"" + nome + "\",\"categoriaId\":" + padaria + "}"))
			.andExpect(status().isCreated())
			.andReturn(), "$.id");
	}

	@Test
	void planejaItemComCategoriaEQuantidade() throws Exception {
		long listaId = criarLista("Mercado");
		mvc.perform(como(ana, post("/api/listas/" + listaId + "/itens"))
			.content("{\"nome\":\"Pão\",\"categoriaId\":" + padaria + ",\"quantidadePlanejada\":\"6 un\"}"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.categoriaId").value(padaria))
			.andExpect(jsonPath("$.quantidadePlanejada").value("6 un"))
			.andExpect(jsonPath("$.pego").value(false))
			.andExpect(jsonPath("$.extra").value(false));

		mvc.perform(como(ana, get("/api/listas/" + listaId)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.categorias", hasSize(8)))
			.andExpect(jsonPath("$.categorias[7].nome").value("Outros"))
			.andExpect(jsonPath("$.itens", hasSize(1)));
	}

	@Test
	void categoriaDeOutraFamiliaERecusada() throws Exception {
		long listaId = criarLista("Mercado");
		mvc.perform(como(ana, post("/api/listas/" + listaId + "/itens"))
			.content("{\"nome\":\"Pão\",\"categoriaId\":" + outraFamiliaCategoria + "}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.erros[0].campo").value("categoriaId"));
	}

	@Test
	void importaListaComItens() throws Exception {
		String corpo = "{\"nome\":\"Importada\",\"itens\":[{\"nome\":\"Pão\",\"categoriaId\":" + padaria
				+ ",\"quantidadePlanejada\":\"6 un\"},{\"nome\":\"Bolo\",\"categoriaId\":" + padaria + "}]}";
		long listaId = lerId(mvc.perform(como(ana, post("/api/familias/" + familiaId + "/listas/importar")).content(corpo))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.nome").value("Importada"))
			.andExpect(jsonPath("$.totalItens").value(2))
			.andReturn(), "$.id");

		mvc.perform(como(ana, get("/api/listas/" + listaId)))
			.andExpect(jsonPath("$.itens", hasSize(2)))
			.andExpect(jsonPath("$.itens[0].nome").value("Pão"))
			.andExpect(jsonPath("$.itens[0].quantidadePlanejada").value("6 un"))
			.andExpect(jsonPath("$.itens[1].quantidadePlanejada").doesNotExist());
	}

	@Test
	void importacaoComCategoriaDeOutraFamiliaNaoCriaALista() throws Exception {
		String corpo = "{\"nome\":\"Importada\",\"itens\":[{\"nome\":\"Pão\",\"categoriaId\":" + padaria
				+ "},{\"nome\":\"Bolo\",\"categoriaId\":" + outraFamiliaCategoria + "}]}";
		mvc.perform(como(ana, post("/api/familias/" + familiaId + "/listas/importar")).content(corpo))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.erros[0].campo").value("itens[1].categoriaId"));

		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/listas"))).andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void importacaoValidaOsItensEExigeSerMembro() throws Exception {
		mvc.perform(como(ana, post("/api/familias/" + familiaId + "/listas/importar"))
			.content("{\"nome\":\"Vazia\",\"itens\":[]}")).andExpect(status().isBadRequest());
		mvc.perform(como(ana, post("/api/familias/" + familiaId + "/listas/importar"))
			.content("{\"nome\":\"X\",\"itens\":[{\"nome\":\"\",\"categoriaId\":" + padaria + "}]}"))
			.andExpect(status().isBadRequest());
		mvc.perform(como(intruso, post("/api/familias/" + familiaId + "/listas/importar"))
			.content("{\"nome\":\"X\",\"itens\":[{\"nome\":\"Pão\",\"categoriaId\":" + padaria + "}]}"))
			.andExpect(status().isNotFound());
	}

	@Test
	void pegaItemComPrecoEQuantidadeECalculaSubtotal() throws Exception {
		long listaId = criarLista("Mercado");
		long pao = adicionarItem(listaId, "Pão");

		mvc.perform(como(ana, put("/api/itens/" + pao + "/pego"))
			.content("{\"quantidadePega\":4,\"tipoPreco\":\"UNIDADE\",\"preco\":7.88,\"marca\":\"Pullman\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.pego").value(true))
			.andExpect(jsonPath("$.pegoPor.nome").value("Ana"))
			.andExpect(jsonPath("$.subtotal").value(31.52))
			.andExpect(jsonPath("$.marca").value("Pullman"));

		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/listas")))
			.andExpect(jsonPath("$[0].totalItens").value(1))
			.andExpect(jsonPath("$[0].itensPegos").value(1));
	}

	@Test
	void pegaPorKgComPrecoTotalEItemSemPrecoFicaSemSubtotal() throws Exception {
		long listaId = criarLista("Feira");
		long banana = adicionarItem(listaId, "Banana");
		long alface = adicionarItem(listaId, "Alface");

		mvc.perform(como(ana, put("/api/itens/" + banana + "/pego"))
			.content("{\"quantidadePega\":1.25,\"tipoPreco\":\"KG\",\"preco\":8.63}"))
			.andExpect(jsonPath("$.tipoPreco").value("KG"))
			.andExpect(jsonPath("$.subtotal").value(8.63));

		// Sem preço: valor só será conhecido no caixa
		mvc.perform(como(ana, put("/api/itens/" + alface + "/pego")).content("{}"))
			.andExpect(jsonPath("$.pego").value(true))
			.andExpect(jsonPath("$.tipoPreco").value("UNIDADE"))
			.andExpect(jsonPath("$.subtotal").doesNotExist());
	}

	@Test
	void desmarcarApagaOsValores() throws Exception {
		long listaId = criarLista("Mercado");
		long leite = adicionarItem(listaId, "Leite");
		mvc.perform(como(ana, put("/api/itens/" + leite + "/pego")).content("{\"preco\":6,\"marca\":\"Itambé\"}"));

		mvc.perform(como(ana, delete("/api/itens/" + leite + "/pego")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.pego").value(false))
			.andExpect(jsonPath("$.pegoPor").doesNotExist())
			.andExpect(jsonPath("$.preco").doesNotExist())
			.andExpect(jsonPath("$.marca").doesNotExist());
	}

	@Test
	void desmarcarTodosZeraACompraEmAndamento() throws Exception {
		long listaId = criarLista("Mercado");
		long pao = adicionarItem(listaId, "Pão");
		long cafe = adicionarItem(listaId, "Café");
		mvc.perform(como(ana, put("/api/itens/" + pao + "/pego")).content("{\"preco\":7}"));
		mvc.perform(como(ana, put("/api/itens/" + cafe + "/pego")).content("{\"preco\":15}"));

		mvc.perform(como(ana, post("/api/listas/" + listaId + "/desmarcar-todos"))).andExpect(status().isNoContent());

		mvc.perform(como(ana, get("/api/listas/" + listaId)))
			.andExpect(jsonPath("$.itens", hasSize(2)))
			.andExpect(jsonPath("$.itens[?(@.pego == true)]", hasSize(0)))
			.andExpect(jsonPath("$.itens[?(@.preco != null)]", hasSize(0)));
	}

	@Test
	void itemNaoPlanejadoEntraComoPegoEExtra() throws Exception {
		long listaId = criarLista("Mercado");
		mvc.perform(como(ana, post("/api/listas/" + listaId + "/itens/extra"))
			.content("{\"nome\":\"Chocolate\",\"categoriaId\":" + padaria + ",\"preco\":5.5}"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.pego").value(true))
			.andExpect(jsonPath("$.extra").value(true))
			.andExpect(jsonPath("$.subtotal").value(5.5));
	}

	@Test
	void editaPlanejamentoERemoveItem() throws Exception {
		long listaId = criarLista("Mercado");
		long item = adicionarItem(listaId, "Leite");
		long laticinios = categoria(ana, familiaId, "Laticínios, Frios e Ovos");

		mvc.perform(como(ana, patch("/api/itens/" + item))
			.content("{\"nome\":\"Leite desnatado\",\"categoriaId\":" + laticinios + ",\"quantidadePlanejada\":\"\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("Leite desnatado"))
			.andExpect(jsonPath("$.categoriaId").value(laticinios))
			.andExpect(jsonPath("$.quantidadePlanejada").doesNotExist());

		mvc.perform(como(ana, delete("/api/itens/" + item))).andExpect(status().isNoContent());
		mvc.perform(como(ana, get("/api/listas/" + listaId))).andExpect(jsonPath("$.itens", hasSize(0)));
	}

	@Test
	void renomeiaEExcluiLista() throws Exception {
		long listaId = criarLista("Mercado");

		mvc.perform(como(ana, patch("/api/listas/" + listaId)).content("{\"nome\":\"Feira\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("Feira"));

		mvc.perform(como(ana, delete("/api/listas/" + listaId))).andExpect(status().isNoContent());
		mvc.perform(como(ana, get("/api/listas/" + listaId))).andExpect(status().isNotFound());
	}

	@Test
	void usuarioDeOutraFamiliaRecebe404EmListasEItens() throws Exception {
		long listaId = criarLista("Mercado");
		long item = adicionarItem(listaId, "Leite");

		mvc.perform(como(intruso, get("/api/familias/" + familiaId + "/listas"))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, post("/api/familias/" + familiaId + "/listas")).content("{\"nome\":\"X\"}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, get("/api/listas/" + listaId))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, patch("/api/listas/" + listaId)).content("{\"nome\":\"X\"}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, delete("/api/listas/" + listaId))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, post("/api/listas/" + listaId + "/itens"))
			.content("{\"nome\":\"X\",\"categoriaId\":" + outraFamiliaCategoria + "}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, post("/api/listas/" + listaId + "/itens/extra"))
			.content("{\"nome\":\"X\",\"categoriaId\":" + outraFamiliaCategoria + "}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, post("/api/listas/" + listaId + "/desmarcar-todos")))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, put("/api/itens/" + item + "/pego")).content("{}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, delete("/api/itens/" + item + "/pego"))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, patch("/api/itens/" + item)).content("{\"nome\":\"X\"}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, delete("/api/itens/" + item))).andExpect(status().isNotFound());

		// Nada foi alterado
		mvc.perform(como(ana, get("/api/listas/" + listaId)))
			.andExpect(jsonPath("$.nome").value("Mercado"))
			.andExpect(jsonPath("$.itens", hasSize(1)))
			.andExpect(jsonPath("$.itens[0].nome").value("Leite"))
			.andExpect(jsonPath("$.itens[0].pego").value(false));
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
			.andExpect(jsonPath("$.erros[?(@.campo == 'nome')]", hasSize(1)))
			.andExpect(jsonPath("$.erros[?(@.campo == 'categoriaId')]", hasSize(1)));

		long item = adicionarItem(listaId, "Leite");
		mvc.perform(como(ana, patch("/api/itens/" + item)).content("{\"nome\":\"  \"}"))
			.andExpect(status().isBadRequest());
		mvc.perform(como(ana, put("/api/itens/" + item + "/pego")).content("{\"preco\":-1,\"quantidadePega\":0}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.erros", hasSize(2)));
		// Tipo de preço desconhecido: 400 com mensagem em português (não "Failed to read request")
		mvc.perform(como(ana, put("/api/itens/" + item + "/pego")).content("{\"tipoPreco\":\"LITRO\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.detail").value("Não foi possível ler os dados enviados. Verifique os valores informados."));
	}

}
