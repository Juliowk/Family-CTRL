package br.com.familyctrl.infra.erro;

/** Credenciais inválidas ou usuário do token não existe mais. Responde 401. */
public class NaoAutenticadoException extends RuntimeException {

	public NaoAutenticadoException(String mensagem) {
		super(mensagem);
	}

}
