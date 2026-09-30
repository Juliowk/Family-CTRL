package br.com.familyctrl.familia;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;

import br.com.familyctrl.IntegracaoTest;

class FamiliaControllerTest extends IntegracaoTest {

	private long criarFamilia(Sessao sessao, String nome) throws Exception {
		return lerId(mvc.perform(como(sessao, post("/api/familias")).content("{\"nome\":\"" + nome + "\"}"))
			.andExpect(status().isCreated())
			.andReturn(), "$.id");
	}

	private String codigoDe(Sessao sessao, long familiaId) throws Exception {
		String json = mvc.perform(como(sessao, get("/api/familias/" + familiaId)))
			.andReturn()
			.getResponse()
			.getContentAsString();
		return JsonPath.read(json, "$.codigoConvite");
	}

	private void entrar(Sessao sessao, String codigo) throws Exception {
		mvc.perform(como(sessao, post("/api/familias/entrar")).content("{\"codigo\":\"" + codigo + "\"}"))
			.andExpect(status().isOk());
	}

	@Test
	void criadorViraAdminEVeCodigoDeConvite() throws Exception {
		Sessao ana = cadastrar("Ana");
		long id = criarFamilia(ana, "Casa");

		mvc.perform(como(ana, get("/api/familias/" + id)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("Casa"))
			.andExpect(jsonPath("$.meuPapel").value("ADMIN"))
			.andExpect(jsonPath("$.codigoConvite").isString())
			.andExpect(jsonPath("$.membros", hasSize(1)))
			.andExpect(jsonPath("$.membros[0].nome").value("Ana"));

		mvc.perform(como(ana, get("/api/familias")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].id").value(id))
			.andExpect(jsonPath("$[0].totalMembros").value(1));
	}

	@Test
	void outroUsuarioEntraPeloCodigoSemDiferenciarMaiusculas() throws Exception {
		Sessao ana = cadastrar("Ana");
		Sessao bia = cadastrar("Bia");
		long id = criarFamilia(ana, "Casa");

		entrar(bia, codigoDe(ana, id).toLowerCase());

		mvc.perform(como(bia, get("/api/familias/" + id)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.meuPapel").value("MEMBRO"))
			.andExpect(jsonPath("$.membros", hasSize(2)));
	}

	@Test
	void codigoInvalidoRetorna404() throws Exception {
		Sessao ana = cadastrar("Ana");
		mvc.perform(como(ana, post("/api/familias/entrar")).content("{\"codigo\":\"XXXXXXXX\"}"))
			.andExpect(status().isNotFound());
	}

	@Test
	void usuarioDeOutraFamiliaRecebe404EmTodasAsOperacoes() throws Exception {
		Sessao ana = cadastrar("Ana");
		Sessao intruso = cadastrar("Intruso");
		long id = criarFamilia(ana, "Casa");

		mvc.perform(como(intruso, get("/api/familias/" + id))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, patch("/api/familias/" + id)).content("{\"nome\":\"Hack\"}"))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, post("/api/familias/" + id + "/convite"))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, patch("/api/familias/" + id + "/membros/" + ana.id()))
			.content("{\"papel\":\"MEMBRO\"}")).andExpect(status().isNotFound());
		mvc.perform(como(intruso, delete("/api/familias/" + id + "/membros/" + ana.id())))
			.andExpect(status().isNotFound());
		mvc.perform(como(intruso, post("/api/familias/" + id + "/sair"))).andExpect(status().isNotFound());
		mvc.perform(como(intruso, get("/api/familias")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$", hasSize(0)));
	}

	@Test
	void familiaInexistenteRetorna404() throws Exception {
		Sessao ana = cadastrar("Ana");
		mvc.perform(como(ana, get("/api/familias/999999"))).andExpect(status().isNotFound());
	}

	@Test
	void adminRenomeiaEGeraNovoCodigo() throws Exception {
		Sessao ana = cadastrar("Ana");
		long id = criarFamilia(ana, "Casa");
		String codigoAntigo = codigoDe(ana, id);

		mvc.perform(como(ana, patch("/api/familias/" + id)).content("{\"nome\":\"Casa da Praia\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nome").value("Casa da Praia"));

		mvc.perform(como(ana, post("/api/familias/" + id + "/convite")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.codigoConvite").value(not(codigoAntigo)));

		Sessao bia = cadastrar("Bia");
		mvc.perform(como(bia, post("/api/familias/entrar")).content("{\"codigo\":\"" + codigoAntigo + "\"}"))
			.andExpect(status().isNotFound());
	}

	@Test
	void membroComumNaoPodeAcoesDeAdmin() throws Exception {
		Sessao ana = cadastrar("Ana");
		Sessao bia = cadastrar("Bia");
		long id = criarFamilia(ana, "Casa");
		entrar(bia, codigoDe(ana, id));

		mvc.perform(como(bia, patch("/api/familias/" + id)).content("{\"nome\":\"X\"}"))
			.andExpect(status().isForbidden());
		mvc.perform(como(bia, post("/api/familias/" + id + "/convite"))).andExpect(status().isForbidden());
		mvc.perform(como(bia, delete("/api/familias/" + id + "/membros/" + ana.id())))
			.andExpect(status().isForbidden());
	}

	@Test
	void adminPromoveERemoveMembros() throws Exception {
		Sessao ana = cadastrar("Ana");
		Sessao bia = cadastrar("Bia");
		Sessao caio = cadastrar("Caio");
		long id = criarFamilia(ana, "Casa");
		String codigo = codigoDe(ana, id);
		entrar(bia, codigo);
		entrar(caio, codigo);

		mvc.perform(como(ana, patch("/api/familias/" + id + "/membros/" + bia.id())).content("{\"papel\":\"ADMIN\"}"))
			.andExpect(status().isOk());
		mvc.perform(como(bia, get("/api/familias/" + id))).andExpect(jsonPath("$.meuPapel").value("ADMIN"));

		mvc.perform(como(ana, delete("/api/familias/" + id + "/membros/" + caio.id())))
			.andExpect(status().isNoContent());
		mvc.perform(como(caio, get("/api/familias/" + id))).andExpect(status().isNotFound());
	}

	@Test
	void ultimoAdminNaoPodeSairNemSeRebaixarComOutrosMembros() throws Exception {
		Sessao ana = cadastrar("Ana");
		Sessao bia = cadastrar("Bia");
		long id = criarFamilia(ana, "Casa");
		entrar(bia, codigoDe(ana, id));

		mvc.perform(como(ana, post("/api/familias/" + id + "/sair"))).andExpect(status().isConflict());
		mvc.perform(como(ana, patch("/api/familias/" + id + "/membros/" + ana.id())).content("{\"papel\":\"MEMBRO\"}"))
			.andExpect(status().isConflict());

		// Depois de promover a Bia, a Ana pode sair
		mvc.perform(como(ana, patch("/api/familias/" + id + "/membros/" + bia.id())).content("{\"papel\":\"ADMIN\"}"))
			.andExpect(status().isOk());
		mvc.perform(como(ana, post("/api/familias/" + id + "/sair"))).andExpect(status().isNoContent());
		mvc.perform(como(ana, get("/api/familias/" + id))).andExpect(status().isNotFound());
	}

	@Test
	void membroComumPodeSair() throws Exception {
		Sessao ana = cadastrar("Ana");
		Sessao bia = cadastrar("Bia");
		long id = criarFamilia(ana, "Casa");
		entrar(bia, codigoDe(ana, id));

		mvc.perform(como(bia, post("/api/familias/" + id + "/sair"))).andExpect(status().isNoContent());
		mvc.perform(como(ana, get("/api/familias/" + id))).andExpect(jsonPath("$.membros", hasSize(1)));
	}

	@Test
	void unicoMembroAoSairExcluiAFamilia() throws Exception {
		Sessao ana = cadastrar("Ana");
		long id = criarFamilia(ana, "Casa");
		String codigo = codigoDe(ana, id);

		mvc.perform(como(ana, post("/api/familias/" + id + "/sair"))).andExpect(status().isNoContent());

		Sessao bia = cadastrar("Bia");
		mvc.perform(como(bia, post("/api/familias/entrar")).content("{\"codigo\":\"" + codigo + "\"}"))
			.andExpect(status().isNotFound());
	}

	@Test
	void nomeEmBrancoRetorna400() throws Exception {
		Sessao ana = cadastrar("Ana");
		mvc.perform(como(ana, post("/api/familias")).content("{\"nome\":\"  \"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.erros[0].campo").value("nome"));
	}

}
