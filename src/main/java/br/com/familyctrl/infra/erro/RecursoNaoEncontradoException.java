package br.com.familyctrl.infra.erro;

/**
 * Recurso inexistente OU que o usuário não tem permissão de ver.
 * Os dois casos respondem 404 para não revelar a existência do recurso.
 */
public class RecursoNaoEncontradoException extends RuntimeException {

	public RecursoNaoEncontradoException(String mensagem) {
		super(mensagem);
	}

}
