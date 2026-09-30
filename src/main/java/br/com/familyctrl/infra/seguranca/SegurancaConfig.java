package br.com.familyctrl.infra.seguranca;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import br.com.familyctrl.infra.config.CorsProperties;

/**
 * Configuração de segurança da API.
 *
 * <ul>
 * <li>Stateless: nenhuma sessão HTTP; cada requisição traz o JWT no header Authorization.</li>
 * <li>CSRF desabilitado: o ataque CSRF depende de cookies enviados automaticamente pelo
 * navegador, e esta API não usa cookies.</li>
 * <li>CORS liberado apenas para as origens configuradas (o front no GitHub Pages).</li>
 * </ul>
 */
@Configuration(proxyBeanMethods = false)
class SegurancaConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http.csrf(AbstractHttpConfigurer::disable)
			.cors(Customizer.withDefaults())
			.httpBasic(AbstractHttpConfigurer::disable)
			.formLogin(AbstractHttpConfigurer::disable)
			.logout(AbstractHttpConfigurer::disable)
			.sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth.requestMatchers(HttpMethod.OPTIONS, "/**")
				.permitAll()
				.requestMatchers(HttpMethod.POST, "/api/auth/cadastro", "/api/auth/login")
				.permitAll()
				.requestMatchers(HttpMethod.GET, "/actuator/health")
				.permitAll()
				.requestMatchers("/error")
				.permitAll()
				.anyRequest()
				.authenticated())
			.oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults())
				.authenticationEntryPoint((request, response, ex) -> {
					response.setHeader("WWW-Authenticate", "Bearer");
					RespostaProblema.escrever(response, HttpStatus.UNAUTHORIZED.value(), "Não autenticado",
							"Token ausente, inválido ou expirado.");
				})
				.accessDeniedHandler((request, response, ex) -> RespostaProblema.escrever(response,
						HttpStatus.FORBIDDEN.value(), "Acesso negado", "Você não tem permissão para esta ação.")));
		return http.build();
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(CorsProperties props) {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(props.allowedOrigins());
		config.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
		config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		config.setAllowCredentials(false);
		config.setMaxAge(3600L);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

}
