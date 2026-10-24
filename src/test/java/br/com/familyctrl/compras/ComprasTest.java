package br.com.familyctrl.compras;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import br.com.familyctrl.IntegracaoTest;

class ComprasTest extends IntegracaoTest {

	private Sessao ana;

	private Sessao intruso;

	private long familiaId;

	private long listaId;

	private long padaria;

	private long hortifruti;

	@BeforeEach
	void setUp() throws Exception {
		ana = cadastrar("Ana");
		intruso = cadastrar("Intruso");
		familiaId = lerId(mvc.perform(como(ana, post("/api/familias")).content("{\"nome\":\"Casa\"}")).andReturn(),
				"$.id");
		String categorias = mvc.perform(como(ana, get("/api/familias/" + familiaId + "/categorias")))
			.andReturn()
			.getResponse()
			.getContentAsString();
		padaria = idDe(categorias, "Padaria");
		hortifruti = idDe(categorias, "Hortifrúti e Congelados");
		listaId = lerId(mvc.perform(como(ana, post("/api/familias/" + familiaId + "/listas"))
			.content("{\"nome\":\"Compra do mês\"}")).andReturn(), "$.id");
	}

	private static long idDe(String json, String nome) {
		List<Number> ids = JsonPath.read(json, "$[?(@.nome == '" + nome + "')].id");
		return ids.getFirst().longValue();
	}

	private long item(String nome, long categoria) throws Exception {
		return lerId(mvc.perform(como(ana, post("/api/listas/" + listaId + "/itens"))
			.content("{\"nome\":\"" + nome + "\",\"categoriaId\":" + categoria + ",\"medida\":\"UNIDADE\"}"))
			.andReturn(), "$.id");
	}

	private void pegar(long item, String json) throws Exception {
		mvc.perform(como(ana, put("/api/itens/" + item + "/pego")).content(json)).andExpect(status().isOk());
	}

	private String finalizar(String valorTotal, String extras) throws Exception {
		String corpo = """
				{"valorTotal":%s,"mercado":"Atacadão","dataCompra":"%s","extrasMantidos":%s}"""
			.formatted(valorTotal, LocalDate.now().minusDays(1), extras);
		return mvc.perform(como(ana, post("/api/listas/" + listaId + "/compras")).content(corpo))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
	}

	@Test
	void finalizaSalvandoACopiaRecalculandoValoresEZerandoALista() throws Exception {
		long pao = item("Pão", padaria);
		long frutas = item("Frutas", hortifruti);
		item("Bolo", padaria); // planejado, não pego
		pegar(pao, "{\"quantidadePega\":4,\"preco\":7.88,\"marca\":\"Pullman\"}");
		pegar(frutas, "{}"); // preço descoberto no caixa

		String compra = finalizar("44.02", "[]");

		long compraId = ((Number) JsonPath.read(compra, "$.id")).longValue();
		mvc.perform(como(ana, get("/api/compras/" + compraId)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.listaNome").value("Compra do mês"))
			.andExpect(jsonPath("$.mercado").value("Atacadão"))
			.andExpect(jsonPath("$.valorItens").value(31.52))
			.andExpect(jsonPath("$.valorVariavel").value(12.5))
			.andExpect(jsonPath("$.valorTotal").value(44.02))
			.andExpect(jsonPath("$.totalItens").value(3))
			.andExpect(jsonPath("$.itensPegos").value(2))
			.andExpect(jsonPath("$.finalizadaPor").value("Ana"))
			.andExpect(jsonPath("$.itens[?(@.nome == 'Pão')].marca").value("Pullman"))
			.andExpect(jsonPath("$.itens[?(@.nome == 'Pão')].categoria").value("Padaria"));

		// A lista continua, zerada, pronta para a próxima compra
		mvc.perform(como(ana, get("/api/listas/" + listaId)))
			.andExpect(jsonPath("$.itens", hasSize(3)))
			.andExpect(jsonPath("$.itens[?(@.pego == true)]", hasSize(0)))
			.andExpect(jsonPath("$.itens[?(@.marca != null)]", hasSize(0)));

		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/compras")))
			.andExpect(jsonPath("$", hasSize(1)))
			.andExpect(jsonPath("$[0].itensPegos").value(2))
			.andExpect(jsonPath("$[0].totalItens").value(3));
	}

	@Test
	void extrasMantidosViramPlanejadosEOsOutrosSaemDaLista() throws Exception {
		long pao = item("Pão", padaria);
		pegar(pao, "{\"preco\":3}");
		long chocolate = lerId(mvc.perform(como(ana, post("/api/listas/" + listaId + "/itens/extra"))
			.content("{\"nome\":\"Chocolate\",\"categoriaId\":" + padaria + ",\"preco\":5}")).andReturn(), "$.id");
		lerId(mvc.perform(como(ana, post("/api/listas/" + listaId + "/itens/extra"))
			.content("{\"nome\":\"Pilhas\",\"categoriaId\":" + padaria + ",\"preco\":12}")).andReturn(), "$.id");

		String compra = finalizar("5", "[" + chocolate + "]");

		// Os dois extras ficam registrados na compra concluída
		org.assertj.core.api.Assertions.assertThat((List<?>) JsonPath.read(compra, "$.itens[?(@.extra == true)]"))
			.hasSize(2);
		mvc.perform(como(ana, get("/api/listas/" + listaId)))
			.andExpect(jsonPath("$.itens", hasSize(2)))
			.andExpect(jsonPath("$.itens[?(@.nome == 'Chocolate')].extra").value(false))
			.andExpect(jsonPath("$.itens[?(@.nome == 'Pilhas')]", hasSize(0)));
	}

	@Test
	void naoFinalizaSemItensPegosNemComDataFutura() throws Exception {
		item("Pão", padaria);
		mvc.perform(como(ana, post("/api/listas/" + listaId + "/compras"))
			.content("{\"valorTotal\":0,\"dataCompra\":\"" + LocalDate.now() + "\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.erros[0].campo").value("itens"));

		mvc.perform(como(ana, post("/api/listas/" + listaId + "/compras"))
			.content("{\"mercado\":\"\",\"dataCompra\":\"" + LocalDate.now().plusDays(2) + "\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.erros", hasSize(2)))
			.andExpect(jsonPath("$.erros[?(@.campo == 'valorTotal')]", hasSize(1)))
			.andExpect(jsonPath("$.erros[?(@.campo == 'dataCompra')]", hasSize(1)));
	}

	@Test
	void valorPagoMenorQueOsItensFicaComoDescontoESemMercado() throws Exception {
		long pao = item("Pão", padaria);
		pegar(pao, "{\"quantidadePega\":4,\"preco\":7.88}");

		String compra = mvc.perform(como(ana, post("/api/listas/" + listaId + "/compras"))
			.content("{\"valorTotal\":30,\"dataCompra\":\"" + LocalDate.now() + "\"}"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.mercado").doesNotExist())
			.andExpect(jsonPath("$.valorItens").value(31.52))
			.andExpect(jsonPath("$.valorVariavel").value(-1.52))
			.andExpect(jsonPath("$.valorTotal").value(30))
			.andReturn()
			.getResponse()
			.getContentAsString();

		long compraId = ((Number) JsonPath.read(compra, "$.id")).longValue();
		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/compras")))
			.andExpect(jsonPath("$[0].id").value(compraId))
			.andExpect(jsonPath("$[0].mercado").doesNotExist())
			.andExpect(jsonPath("$[0].valorTotal").value(30));
	}

	@Test
	void resumoDoMesSomaAsComprasDaFamilia() throws Exception {
		long pao = item("Pão", padaria);
		pegar(pao, "{\"preco\":10}");
		finalizar("22.50", "[]");
		YearMonth mes = YearMonth.from(LocalDate.now().minusDays(1));

		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/compras/resumo?mes=" + mes)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.gasto").value(22.5))
			.andExpect(jsonPath("$.compras").value(1))
			.andExpect(jsonPath("$.ultimaCompra.mercado").value("Atacadão"));

		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/compras/resumo?mes=2020-01")))
			.andExpect(jsonPath("$.gasto").value(0))
			.andExpect(jsonPath("$.compras").value(0));
		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/compras/resumo?mes=outubro")))
			.andExpect(status().isBadRequest());
	}

	@Test
	void usuarioDeOutraFamiliaRecebe404() throws Exception {
		long pao = item("Pão", padaria);
		pegar(pao, "{\"preco\":3}");
		long compraId = ((Number) JsonPath.read(finalizar("3", "[]"), "$.id")).longValue();
		pegar(pao, "{\"preco\":3}");

		mvc.perform(como(intruso, post("/api/listas/" + listaId + "/compras"))
			.content("{\"valorTotal\":0,\"dataCompra\":\"" + LocalDate.now() + "\"}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, get("/api/compras/" + compraId))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, get("/api/familias/" + familiaId + "/compras"))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, get("/api/familias/" + familiaId + "/compras/resumo?mes=2026-01")))
			.andExpect(status().isNotFound());

		// A compra em andamento da Ana continua intacta
		mvc.perform(como(ana, get("/api/listas/" + listaId))).andExpect(jsonPath("$.itens[0].pego").value(true));
	}

}
