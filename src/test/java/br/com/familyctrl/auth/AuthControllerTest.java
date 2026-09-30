package br.com.familyctrl.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import br.com.familyctrl.IntegracaoTest;

class AuthControllerTest extends IntegracaoTest {

	private String cadastroJson(String nome, String email, String senha, String confirmacao) {
		return """
				{"nome":"%s","email":"%s","senha":"%s","confirmacaoSenha":"%s"}""".formatted(nome, email, senha,
				confirmacao);
	}

	private String loginJson(String email, String senha, boolean lembrar) {
		return """
				{"email":"%s","senha":"%s","lembrarDeMim":%s}""".formatted(email, senha, lembrar);
	}

	@Test
	void cadastroRetorna201ComTokenEUsuario() throws Exception {
		String email = emailUnico();
		mvc.perform(post("/api/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
			.content(cadastroJson("Ana", email, "senha-segura", "senha-segura")))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.token").isNotEmpty())
			.andExpect(jsonPath("$.usuario.nome").value("Ana"))
			.andExpect(jsonPath("$.usuario.email").value(email))
			.andExpect(jsonPath("$.usuario.senhaHash").doesNotExist());
	}

	@Test
	void cadastroComEmailDuplicadoRetorna409MesmoComMaiusculas() throws Exception {
		Sessao ana = cadastrar("Ana");
		mvc.perform(post("/api/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
			.content(cadastroJson("Outra", ana.email().toUpperCase(), "senha-segura", "senha-segura")))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.status").value(409));
	}

	@Test
	void cadastroInvalidoRetorna400ComErrosPorCampo() throws Exception {
		mvc.perform(post("/api/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
			.content(cadastroJson("", "nao-e-email", "curta", "curta")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.erros[*].campo", hasItem("nome")))
			.andExpect(jsonPath("$.erros[*].campo", hasItem("email")))
			.andExpect(jsonPath("$.erros[*].campo", hasItem("senha")));
	}

	@Test
	void cadastroComSenhasDiferentesRetorna400() throws Exception {
		mvc.perform(post("/api/auth/cadastro").contentType(MediaType.APPLICATION_JSON)
			.content(cadastroJson("Ana", emailUnico(), "senha-segura", "outra-senha")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.erros[0].campo").value("confirmacaoSenha"));
	}

	@Test
	void jsonMalformadoRetorna400ComProblemDetail() throws Exception {
		mvc.perform(post("/api/auth/cadastro").contentType(MediaType.APPLICATION_JSON).content("{ruim"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.status").value(400));
	}

	@Test
	void loginComCredenciaisCorretasRetornaToken() throws Exception {
		Sessao ana = cadastrar("Ana");
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content(loginJson(ana.email(), "senha-segura", false)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.token").isNotEmpty())
			.andExpect(jsonPath("$.usuario.id").value(ana.id()));
	}

	@Test
	void loginComSenhaErradaRetorna401() throws Exception {
		Sessao ana = cadastrar("Ana");
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content(loginJson(ana.email(), "senha-errada", false)))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.detail").value("E-mail ou senha incorretos."));
	}

	@Test
	void loginComEmailInexistenteRetorna401() throws Exception {
		mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
			.content(loginJson(emailUnico(), "senha-segura", false)))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void lembrarDeMimGeraTokenComValidadeMaior() throws Exception {
		Sessao ana = cadastrar("Ana");
		String curto = mvc
			.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content(loginJson(ana.email(), "senha-segura", false)))
			.andReturn()
			.getResponse()
			.getContentAsString();
		String longo = mvc
			.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content(loginJson(ana.email(), "senha-segura", true)))
			.andReturn()
			.getResponse()
			.getContentAsString();

		Instant expiraCurto = Instant.parse(JsonPath.read(curto, "$.expiraEm"));
		Instant expiraLongo = Instant.parse(JsonPath.read(longo, "$.expiraEm"));
		assertThat(Duration.between(expiraCurto, expiraLongo)).isGreaterThan(Duration.ofDays(5));
	}

	@Test
	void meRetornaUsuarioAutenticado() throws Exception {
		Sessao ana = cadastrar("Ana");
		mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, ana.bearer()))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.id").value(ana.id()))
			.andExpect(jsonPath("$.email").value(ana.email()));
	}

	@Test
	void meSemTokenRetorna401() throws Exception {
		mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
	}

}
