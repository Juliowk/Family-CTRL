package br.com.familyctrl.infra.erro;

/** O usuário é membro da família, mas não tem o papel necessário (ex.: não é ADMIN). Responde 403. */
public class AcessoNegadoException extends RuntimeException {

	public AcessoNegadoException(String mensagem) {
		super(mensagem);
	}

}
