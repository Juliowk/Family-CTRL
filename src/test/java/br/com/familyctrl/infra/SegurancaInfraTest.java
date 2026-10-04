package br.com.familyctrl.infra;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import br.com.familyctrl.IntegracaoTest;

class SegurancaInfraTest extends IntegracaoTest {

	@Test
	void healthEhPublico() throws Exception {
		mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
	}

	@Test
	void outrosEndpointsDoActuatorNaoSaoExpostos() throws Exception {
		mvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
	}

	@Test
	void semTokenRetorna401ComProblemDetail() throws Exception {
		mvc.perform(get("/api/familias"))
			.andExpect(status().isUnauthorized())
			.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
			.andExpect(jsonPath("$.status").value(401))
			.andExpect(jsonPath("$.title").value("Não autenticado"));
	}

	@Test
	void tokenMalformadoRetorna401() throws Exception {
		mvc.perform(get("/api/familias").header(HttpHeaders.AUTHORIZATION, "Bearer nao-e-um-jwt"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void tokenAssinadoComOutroSegredoRetorna401() throws Exception {
		var chaveFalsa = new SecretKeySpec("outro-segredo-qualquer-com-32-bytes-ou-mais".getBytes(StandardCharsets.UTF_8),
				"HmacSHA256");
		var encoder = NimbusJwtEncoder.withSecretKey(chaveFalsa).algorithm(MacAlgorithm.HS256).build();
		var claims = JwtClaimsSet.builder()
			.issuer("family-ctrl")
			.subject("1")
			.issuedAt(Instant.now())
			.expiresAt(Instant.now().plusSeconds(3600))
			.build();
		String token = encoder
			.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
			.getTokenValue();

		mvc.perform(get("/api/familias").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void corsPermiteOrigemConfigurada() throws Exception {
		mvc.perform(options("/api/familias").header(HttpHeaders.ORIGIN, "http://localhost:5173")
			.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
			.header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization"))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));
	}

	/**
	 * O navegador faz o preflight (OPTIONS) antes de PUT, PATCH e DELETE. Todo método usado pelo
	 * front precisa estar liberado, senão a chamada nem chega ao controller (e o backend não loga
	 * nada). Foi assim que um PUT novo quebrou sem nenhum teste falhar.
	 */
	@ParameterizedTest
	@ValueSource(strings = { "GET", "POST", "PUT", "PATCH", "DELETE" })
	void corsPermiteTodosOsMetodosUsadosPeloFront(String metodo) throws Exception {
		mvc.perform(options("/api/itens/1/pego").header(HttpHeaders.ORIGIN, "http://localhost:5173")
			.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, metodo)
			.header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "Authorization, Content-Type"))
			.andExpect(status().isOk())
			.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
			.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS,
					containsString(metodo)));
	}

	@Test
	void corsBloqueiaOrigemDesconhecida() throws Exception {
		mvc.perform(options("/api/familias").header(HttpHeaders.ORIGIN, "https://site-malicioso.example")
			.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
			.andExpect(status().isForbidden())
			.andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
	}

}
