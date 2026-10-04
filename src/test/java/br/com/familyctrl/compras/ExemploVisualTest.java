package br.com.familyctrl.compras;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.YearMonth;
import java.util.List;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import br.com.familyctrl.IntegracaoTest;
import br.com.familyctrl.categorias.CategoriaService;
import br.com.familyctrl.familia.FamiliaCriada;
import br.com.familyctrl.itens.ItemService;
import br.com.familyctrl.listas.ListaService;

/**
 * A lista "Exemplo Visual" de toda família nova. No perfil de teste o exemplo vem desligado (as
 * outras famílias de teste começam vazias), então aqui criamos o ouvinte ligado na mão, com os
 * mesmos serviços da aplicação.
 */
class ExemploVisualTest extends IntegracaoTest {

	@Autowired
	private ListaService listaService;

	@Autowired
	private ItemService itemService;

	@Autowired
	private CategoriaService categoriaService;

	@Autowired
	private CompraRepository compras;

	private Sessao ana;

	private long familiaId;

	@BeforeEach
	void setUp() throws Exception {
		ana = cadastrar("Ana");
		familiaId = lerId(mvc.perform(como(ana, post("/api/familias")).content("{\"nome\":\"Casa\"}")).andReturn(),
				"$.id");
	}

	private void criarExemplo() {
		new ExemploVisual(true, listaService, itemService, categoriaService, compras)
			.aoCriarFamilia(new FamiliaCriada(familiaId, ana.id()));
	}

	@Test
	void desligadoNaoCriaNada() throws Exception {
		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/listas"))).andExpect(jsonPath("$", hasSize(0)));
		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/compras"))).andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void criaListaCompletaComHistoricoDe15Compras() throws Exception {
		criarExemplo();

		String listas = mvc.perform(como(ana, get("/api/familias/" + familiaId + "/listas")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$", hasSize(1)))
			.andExpect(jsonPath("$[0].nome").value(ExemploVisual.NOME_LISTA))
			.andExpect(jsonPath("$[0].itensPegos").value(6))
			.andReturn()
			.getResponse()
			.getContentAsString();
		long listaId = ((Number) JsonPath.read(listas, "$[0].id")).longValue();

		// Todas as categorias padrão têm itens
		String lista = mvc.perform(como(ana, get("/api/listas/" + listaId)))
			.andReturn()
			.getResponse()
			.getContentAsString();
		List<Number> categoriasComItens = JsonPath.read(lista, "$.itens[*].categoriaId");
		assertThat(categoriasComItens.stream().distinct()).hasSize(8);

		String historico = mvc.perform(como(ana, get("/api/familias/" + familiaId + "/compras")))
			.andExpect(jsonPath("$", hasSize(ExemploVisual.TOTAL_COMPRAS)))
			.andExpect(jsonPath("$[?(@.listaId == " + listaId + ")]", hasSize(ExemploVisual.TOTAL_COMPRAS)))
			.andReturn()
			.getResponse()
			.getContentAsString();

		// Datas diferentes, mais de um mercado e valores variados
		List<String> datas = JsonPath.read(historico, "$[*].dataCompra");
		List<String> mercados = JsonPath.read(historico, "$[*].mercado");
		List<Number> totais = JsonPath.read(historico, "$[*].valorTotal");
		List<Number> itens = JsonPath.read(historico, "$[*].totalItens");
		assertThat(datas).doesNotHaveDuplicates();
		assertThat(mercados.stream().distinct().count()).isGreaterThan(1);
		assertThat(totais.stream().map(Number::doubleValue).distinct().count()).isGreaterThan(10);
		assertThat(itens.stream().distinct().count()).isGreaterThan(1);

		// A compra mais recente tem itens com preço e com marca
		long compraId = ((Number) JsonPath.read(historico, "$[0].id")).longValue();
		mvc.perform(como(ana, get("/api/compras/" + compraId)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.listaNome").value(ExemploVisual.NOME_LISTA))
			.andExpect(jsonPath("$.itens[?(@.subtotal != null)]").isNotEmpty())
			.andExpect(jsonPath("$.itens[?(@.marca != null)]").isNotEmpty());
	}

	@Test
	void comprasDoExemploNaoEntramNoResumoDoMes() throws Exception {
		criarExemplo();
		// A compra mais recente do exemplo é de ontem: confere este mês e o anterior
		for (YearMonth mes : List.of(YearMonth.now(), YearMonth.now().minusMonths(1))) {
			mvc.perform(como(ana, get("/api/familias/" + familiaId + "/compras/resumo?mes=" + mes)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.gasto").value(0))
				.andExpect(jsonPath("$.compras").value(0))
				.andExpect(jsonPath("$.ultimaCompra").doesNotExist());
		}
		// Mas continuam nas concluídas, marcadas como exemplo
		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/compras")))
			.andExpect(jsonPath("$[?(@.exemplo == true)]", hasSize(ExemploVisual.TOTAL_COMPRAS)));
	}

	@Test
	void outraFamiliaNaoVeOExemplo() throws Exception {
		criarExemplo();
		Sessao intruso = cadastrar("Intruso");
		mvc.perform(como(intruso, get("/api/familias/" + familiaId + "/compras"))).andExpect(status().isNotFound());
	}

}
