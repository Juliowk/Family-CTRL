package br.com.familyctrl.listas;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import br.com.familyctrl.IntegracaoTest;

/**
 * Duas pessoas da mesma família fazendo a mesma compra, cada uma no seu aparelho: os dois veem
 * sempre os mesmos itens e valores, e ninguém sobrescreve (nem finaliza) algo que não viu.
 */
class CompraSimultaneaTest extends IntegracaoTest {

	private Sessao ana;

	private Sessao bia;

	private long listaId;

	private long padaria;

	@BeforeEach
	void setUp() throws Exception {
		ana = cadastrar("Ana");
		bia = cadastrar("Bia");
		String familia = mvc.perform(como(ana, post("/api/familias")).content("{\"nome\":\"Casa\"}"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		long familiaId = ((Number) JsonPath.read(familia, "$.id")).longValue();
		String codigo = JsonPath.read(
				mvc.perform(como(ana, get("/api/familias/" + familiaId))).andReturn().getResponse().getContentAsString(),
				"$.codigoConvite");
		mvc.perform(como(bia, post("/api/familias/entrar")).content("{\"codigo\":\"" + codigo + "\"}"))
			.andExpect(status().isOk());
		String categorias = mvc.perform(como(ana, get("/api/familias/" + familiaId + "/categorias")))
			.andReturn()
			.getResponse()
			.getContentAsString();
		List<Number> ids = JsonPath.read(categorias, "$[?(@.nome == 'Padaria')].id");
		padaria = ids.getFirst().longValue();
		listaId = lerId(mvc.perform(como(ana, post("/api/familias/" + familiaId + "/listas"))
			.content("{\"nome\":\"Mercado\"}")).andExpect(status().isCreated()).andReturn(), "$.id");
	}

	private long adicionarItem(String nome) throws Exception {
		return lerId(mvc.perform(como(ana, post("/api/listas/" + listaId + "/itens"))
			.content("{\"nome\":\"" + nome + "\",\"categoriaId\":" + padaria + ",\"medida\":\"UNIDADE\"}"))
			.andExpect(status().isCreated())
			.andReturn(), "$.id");
	}

	private String detalhe(Sessao sessao) throws Exception {
		return mvc.perform(como(sessao, get("/api/listas/" + listaId)))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();
	}

	private long versaoDaLista(Sessao sessao) throws Exception {
		return ((Number) JsonPath.read(detalhe(sessao), "$.versao")).longValue();
	}

	private long versaoDoItem(Sessao sessao, long itemId) throws Exception {
		List<Number> versoes = JsonPath.read(detalhe(sessao), "$.itens[?(@.id == " + itemId + ")].versao");
		return versoes.getFirst().longValue();
	}

	@Test
	void oQueUmMarcaOOutroVeIgual() throws Exception {
		long pao = adicionarItem("Pão");
		mvc.perform(como(ana, put("/api/itens/" + pao + "/pego"))
			.content("{\"quantidadePega\":3,\"preco\":2.5,\"marca\":\"Pullman\",\"versao\":0}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.versao").value(1));

		// Bia, no outro aparelho, recebe exatamente os mesmos dados (inclusive quem pegou)
		assertThat(detalhe(bia)).isEqualTo(detalhe(ana));
		mvc.perform(como(bia, get("/api/listas/" + listaId)))
			.andExpect(jsonPath("$.itens[0].pego").value(true))
			.andExpect(jsonPath("$.itens[0].subtotal").value(7.5))
			.andExpect(jsonPath("$.itens[0].pegoPor.nome").value("Ana"));
	}

	@Test
	void naoSobrescreveItemAlteradoPorOutraPessoa() throws Exception {
		long pao = adicionarItem("Pão");
		long versaoVista = versaoDoItem(bia, pao);

		// Ana marca primeiro; Bia confirma em seguida com a versão que estava na tela dela
		mvc.perform(como(ana, put("/api/itens/" + pao + "/pego")).content("{\"preco\":5,\"versao\":" + versaoVista + "}"))
			.andExpect(status().isOk());
		mvc.perform(como(bia, put("/api/itens/" + pao + "/pego")).content("{\"preco\":9,\"versao\":" + versaoVista + "}"))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("Outra pessoa")));
		mvc.perform(como(bia, delete("/api/itens/" + pao + "/pego").param("versao", String.valueOf(versaoVista))))
			.andExpect(status().isConflict());
		mvc.perform(como(bia, delete("/api/itens/" + pao).param("versao", String.valueOf(versaoVista))))
			.andExpect(status().isConflict());

		// Vale o que a Ana marcou
		mvc.perform(como(bia, get("/api/listas/" + listaId)))
			.andExpect(jsonPath("$.itens[0].preco").value(5.0))
			.andExpect(jsonPath("$.itens[0].pego").value(true));

		// Com a versão atualizada, a Bia consegue corrigir
		long atual = versaoDoItem(bia, pao);
		mvc.perform(como(bia, put("/api/itens/" + pao + "/pego")).content("{\"preco\":9,\"versao\":" + atual + "}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.preco").value(9.0));
	}

	@Test
	void naoFinalizaNemDesmarcaTodosComValoresDesatualizados() throws Exception {
		long pao = adicionarItem("Pão");
		long cafe = adicionarItem("Café");
		mvc.perform(como(ana, put("/api/itens/" + pao + "/pego")).content("{\"preco\":10}")).andExpect(status().isOk());
		long versaoVistaPelaAna = versaoDaLista(ana);

		// Enquanto a Ana confere o total, a Bia marca mais um item
		mvc.perform(como(bia, put("/api/itens/" + cafe + "/pego")).content("{\"preco\":20}")).andExpect(status().isOk());

		String corpo = """
				{"mercado":"Atacadão","dataCompra":"%s","valorVariavel":0,"extrasMantidos":[],"versaoLista":%d}""";
		mvc.perform(como(ana, post("/api/listas/" + listaId + "/compras"))
			.content(corpo.formatted(LocalDate.now(), versaoVistaPelaAna)))
			.andExpect(status().isConflict());
		mvc.perform(como(ana, post("/api/listas/" + listaId + "/desmarcar-todos")
			.param("versao", String.valueOf(versaoVistaPelaAna)))).andExpect(status().isConflict());

		// Nada mudou: os dois itens continuam pegos
		mvc.perform(como(ana, get("/api/listas/" + listaId))).andExpect(jsonPath("$.itens[?(@.pego == true)]", hasSize(2)));

		// Com a versão atual, finaliza com o total que a tela mostra (10 + 20)
		mvc.perform(como(ana, post("/api/listas/" + listaId + "/compras"))
			.content(corpo.formatted(LocalDate.now(), versaoDaLista(ana))))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.valorTotal").value(30.0));
	}

	@Test
	void marcacoesAoMesmoTempoNaoSePerdem() throws Exception {
		int quantidade = 8;
		List<Long> itens = new ArrayList<>();
		for (int i = 0; i < quantidade; i++) {
			itens.add(adicionarItem("Item " + i));
		}
		long versaoInicial = versaoDaLista(ana);

		// Ana e Bia marcam itens diferentes ao mesmo tempo
		List<Integer> status = executarJuntos(itens.stream().<Callable<Integer>>map(id -> () -> {
			Sessao quem = id % 2 == 0 ? ana : bia;
			return mvc.perform(como(quem, put("/api/itens/" + id + "/pego")).content("{\"preco\":1.25}"))
				.andReturn()
				.getResponse()
				.getStatus();
		}).toList());

		assertThat(status).containsOnly(200);
		mvc.perform(como(bia, get("/api/listas/" + listaId)))
			.andExpect(jsonPath("$.itens[?(@.pego == true)]", hasSize(quantidade)))
			.andExpect(jsonPath("$.versao").value(versaoInicial + quantidade));
	}

	@Test
	void doisConfirmandoOMesmoItemAoMesmoTempoSoUmGrava() throws Exception {
		long pao = adicionarItem("Pão");
		long versao = versaoDoItem(ana, pao);

		List<Integer> status = executarJuntos(List.of(ana, bia, ana, bia).stream().<Callable<Integer>>map(quem -> () -> mvc
			.perform(como(quem, put("/api/itens/" + pao + "/pego")).content("{\"preco\":3,\"versao\":" + versao + "}"))
			.andReturn()
			.getResponse()
			.getStatus()).toList());

		assertThat(status).containsOnlyOnce(200).filteredOn(s -> s != 200).containsOnly(409);
		assertThat(versaoDoItem(bia, pao)).isEqualTo(versao + 1);
	}

	/** Dispara as chamadas em paralelo, todas liberadas no mesmo instante. */
	private static List<Integer> executarJuntos(List<Callable<Integer>> chamadas) throws Exception {
		CountDownLatch largada = new CountDownLatch(1);
		try (ExecutorService executor = Executors.newFixedThreadPool(chamadas.size())) {
			List<Future<Integer>> futuros = new ArrayList<>();
			for (Callable<Integer> chamada : chamadas) {
				futuros.add(executor.submit(() -> {
					largada.await();
					return chamada.call();
				}));
			}
			largada.countDown();
			List<Integer> resultados = new ArrayList<>();
			for (Future<Integer> futuro : futuros) {
				resultados.add(futuro.get());
			}
			return resultados;
		}
	}

}
