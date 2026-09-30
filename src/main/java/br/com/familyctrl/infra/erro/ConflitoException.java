package br.com.familyctrl.infra.erro;

/** Operação conflita com o estado atual (ex.: e-mail já cadastrado, último ADMIN saindo). Responde 409. */
public class ConflitoException extends RuntimeException {

	public ConflitoException(String mensagem) {
		super(mensagem);
	}

}
