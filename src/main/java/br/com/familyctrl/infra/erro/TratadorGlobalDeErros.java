package br.com.familyctrl.infra.erro;

import java.util.List;

import org.jspecify.annotations.Nullable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Converte exceções em respostas no formato ProblemDetail (RFC 9457).
 *
 * <p>Herdar de {@link ResponseEntityExceptionHandler} faz com que os erros do próprio Spring MVC
 * (JSON malformado, método não suportado, rota inexistente...) também saiam como ProblemDetail.
 */
@RestControllerAdvice
public class TratadorGlobalDeErros extends ResponseEntityExceptionHandler {

	@ExceptionHandler(RecursoNaoEncontradoException.class)
	ProblemDetail naoEncontrado(RecursoNaoEncontradoException ex) {
		return problema(HttpStatus.NOT_FOUND, "Não encontrado", ex.getMessage());
	}

	@ExceptionHandler(ConflitoException.class)
	ProblemDetail conflito(ConflitoException ex) {
		return problema(HttpStatus.CONFLICT, "Conflito", ex.getMessage());
	}

	@ExceptionHandler(AcessoNegadoException.class)
	ProblemDetail acessoNegado(AcessoNegadoException ex) {
		return problema(HttpStatus.FORBIDDEN, "Acesso negado", ex.getMessage());
	}

	@ExceptionHandler(NaoAutenticadoException.class)
	ProblemDetail naoAutenticado(NaoAutenticadoException ex) {
		return problema(HttpStatus.UNAUTHORIZED, "Não autenticado", ex.getMessage());
	}

	@ExceptionHandler(ValidacaoException.class)
	ProblemDetail validacao(ValidacaoException ex) {
		ProblemDetail problema = problema(HttpStatus.BAD_REQUEST, "Dados inválidos",
				"Verifique os campos informados.");
		problema.setProperty("erros", List.of(new ErroCampo(ex.getCampo(), ex.getMessage())));
		return problema;
	}

	/** Rede de segurança para violações de constraint no banco (ex.: dois cadastros simultâneos). */
	@ExceptionHandler(DataIntegrityViolationException.class)
	ProblemDetail integridade(DataIntegrityViolationException ex) {
		return problema(HttpStatus.CONFLICT, "Conflito", "A operação conflita com dados existentes.");
	}

	/** Erros do Bean Validation (@Valid): devolve a lista de erros campo a campo. */
	@Override
	protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		ProblemDetail problema = problema(HttpStatus.BAD_REQUEST, "Dados inválidos",
				"Verifique os campos informados.");
		List<ErroCampo> erros = ex.getBindingResult()
			.getFieldErrors()
			.stream()
			.map(erro -> new ErroCampo(erro.getField(), erro.getDefaultMessage()))
			.toList();
		problema.setProperty("erros", erros);
		return ResponseEntity.badRequest().body(problema);
	}

	private static ProblemDetail problema(HttpStatus status, String titulo, String detalhe) {
		ProblemDetail problema = ProblemDetail.forStatusAndDetail(status, detalhe);
		problema.setTitle(titulo);
		return problema;
	}

}
