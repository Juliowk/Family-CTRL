package br.com.familyctrl.categorias;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import br.com.familyctrl.IntegracaoTest;

class CategoriasTest extends IntegracaoTest {

	private Sessao ana;

	private Sessao intruso;

	private long familiaId;

	@BeforeEach
	void setUp() throws Exception {
		ana = cadastrar("Ana");
		intruso = cadastrar("Intruso");
		familiaId = lerId(mvc.perform(como(ana, post("/api/familias")).content("{\"nome\":\"Casa\"}")).andReturn(),
				"$.id");
	}

	private String categorias() throws Exception {
		return mvc.perform(como(ana, get("/api/familias/" + familiaId + "/categorias")))
			.andReturn()
			.getResponse()
			.getContentAsString();
	}

	private long idDe(String nome) throws Exception {
		List<Number> ids = JsonPath.read(categorias(), "$[?(@.nome == '" + nome + "')].id");
		return ids.getFirst().longValue();
	}

	@Test
	void familiaNovaComecaComAsCategoriasPadraoEOutrosPorUltimo() throws Exception {
		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/categorias")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$", hasSize(8)))
			.andExpect(jsonPath("$[0].nome").value("Açougue, Embutidos e Peixaria"))
			.andExpect(jsonPath("$[7].nome").value("Outros"))
			.andExpect(jsonPath("$[7].fixa").value(true));
	}

	@Test
	void criaCategoriaAntesDeOutrosERecusaNomeRepetido() throws Exception {
		mvc.perform(como(ana, post("/api/familias/" + familiaId + "/categorias")).content("{\"nome\":\"Pet\"}"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.nome").value("Pet"));

		mvc.perform(como(ana, get("/api/familias/" + familiaId + "/categorias")))
			.andExpect(jsonPath("$", hasSize(9)))
			.andExpect(jsonPath("$[7].nome").value("Pet"))
			.andExpect(jsonPath("$[8].nome").value("Outros"));

		mvc.perform(como(ana, post("/api/familias/" + familiaId + "/categorias")).content("{\"nome\":\"pet\"}"))
			.andExpect(status().isConflict());
	}

	@Test
	void excluirCategoriaMoveItensParaOutros() throws Exception {
		long padaria = idDe("Padaria");
		long outros = idDe("Outros");
		long lista = lerId(mvc.perform(como(ana, post("/api/familias/" + familiaId + "/listas"))
			.content("{\"nome\":\"Mercado\"}")).andReturn(), "$.id");
		long item = lerId(mvc.perform(como(ana, post("/api/listas/" + lista + "/itens"))
			.content("{\"nome\":\"Pão\",\"categoriaId\":" + padaria + "}")).andReturn(), "$.id");

		mvc.perform(como(ana, delete("/api/categorias/" + padaria))).andExpect(status().isNoContent());

		mvc.perform(como(ana, get("/api/listas/" + lista)))
			.andExpect(jsonPath("$.itens[0].id").value(item))
			.andExpect(jsonPath("$.itens[0].categoriaId").value(outros));
	}

	@Test
	void outrosNaoPodeSerExcluidaNemRenomeada() throws Exception {
		long outros = idDe("Outros");
		mvc.perform(como(ana, delete("/api/categorias/" + outros))).andExpect(status().isConflict());
		mvc.perform(como(ana, patch("/api/categorias/" + outros)).content("{\"nome\":\"Diversos\"}"))
			.andExpect(status().isConflict());
	}

	@Test
	void renomeiaEReordenaMantendoOutrosPorUltimo() throws Exception {
		long padaria = idDe("Padaria");
		mvc.perform(como(ana, patch("/api/categorias/" + padaria)).content("{\"nome\":\"Pães e bolos\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("Pães e bolos"));

		List<Number> ids = JsonPath.read(categorias(), "$[*].id");
		List<Long> invertidos = ids.stream().map(Number::longValue).collect(Collectors.toCollection(ArrayList::new));
		Collections.reverse(invertidos);
		String corpo = "{\"ids\":" + invertidos + "}";

		mvc.perform(como(ana, put("/api/familias/" + familiaId + "/categorias/ordem")).content(corpo))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].nome").value("Higiene Pessoal"))
			.andExpect(jsonPath("$[7].nome").value("Outros"));

		mvc.perform(como(ana, put("/api/familias/" + familiaId + "/categorias/ordem")).content("{\"ids\":[1]}"))
			.andExpect(status().isBadRequest());
	}

	@Test
	void usuarioDeOutraFamiliaRecebe404() throws Exception {
		long padaria = idDe("Padaria");
		mvc.perform(como(intruso, get("/api/familias/" + familiaId + "/categorias"))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, post("/api/familias/" + familiaId + "/categorias")).content("{\"nome\":\"X\"}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, patch("/api/categorias/" + padaria)).content("{\"nome\":\"X\"}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, delete("/api/categorias/" + padaria))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, put("/api/familias/" + familiaId + "/categorias/ordem")).content("{\"ids\":[]}"))
			.andExpect(status().isNotFound());
	}

}
