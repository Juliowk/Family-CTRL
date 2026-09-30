package br.com.familyctrl.infra.seguranca;

import java.io.IOException;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.MediaType;

/**
 * Escreve um ProblemDetail simples direto na resposta. Usado pelos filtros de segurança,
 * que rodam antes do Spring MVC (e por isso não passam pelo {@code TratadorGlobalDeErros}).
 */
final class RespostaProblema {

	private RespostaProblema() {
	}

	static void escrever(HttpServletResponse response, int status, String titulo, String detalhe)
			throws IOException {
		response.setStatus(status);
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		response.getWriter()
			.write("{\"type\":\"about:blank\",\"title\":\"%s\",\"status\":%d,\"detail\":\"%s\"}".formatted(titulo,
					status, detalhe));
	}

}
