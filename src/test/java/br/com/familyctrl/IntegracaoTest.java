package br.com.familyctrl;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import com.jayway.jsonpath.JsonPath;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Base para testes de integração: sobe a aplicação inteira com um PostgreSQL real (Testcontainers)
 * e disponibiliza o {@link MockMvc} para chamar a API. Todas as subclasses compartilham o mesmo
 * contexto do Spring (e o mesmo contêiner), o que deixa a suíte bem mais rápida.
 *
 * <p>Como o banco é compartilhado entre os testes, cada teste cria seus próprios usuários com
 * e-mails únicos, em vez de depender de dados de outro teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
public abstract class IntegracaoTest {

	@Autowired
	protected MockMvc mvc;

	/** Usuário cadastrado para o teste, com o token pronto para uso. */
	protected record Sessao(Long id, String nome, String email, String token) {

		public String bearer() {
			return "Bearer " + token;
		}

	}

	protected static String emailUnico() {
		return "u-" + UUID.randomUUID() + "@teste.com";
	}

	protected Sessao cadastrar(String nome) throws Exception {
		String email = emailUnico();
		String corpo = """
				{"nome":"%s","email":"%s","senha":"senha-segura","confirmacaoSenha":"senha-segura"}"""
			.formatted(nome, email);
		MvcResult resultado = mvc
			.perform(post("/api/auth/cadastro").contentType(MediaType.APPLICATION_JSON).content(corpo))
			.andExpect(status().isCreated())
			.andReturn();
		String json = resultado.getResponse().getContentAsString();
		Number id = JsonPath.read(json, "$.usuario.id");
		return new Sessao(id.longValue(), nome, email, JsonPath.read(json, "$.token"));
	}

	/** Adiciona o JSON e o token do usuário a uma requisição. */
	protected static MockHttpServletRequestBuilder como(Sessao sessao, MockHttpServletRequestBuilder request) {
		return request.header(HttpHeaders.AUTHORIZATION, sessao.bearer()).contentType(MediaType.APPLICATION_JSON);
	}

	protected static long lerId(MvcResult resultado, String caminho) throws Exception {
		Number id = JsonPath.read(resultado.getResponse().getContentAsString(), caminho);
		return id.longValue();
	}

}
