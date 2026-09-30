package br.com.familyctrl.infra.erro;

/**
 * Erro de validação de um campo detectado no serviço (regras que o Bean Validation não expressa
 * bem, como "as senhas não conferem"). Responde 400 no mesmo formato dos erros de validação.
 */
public class ValidacaoException extends RuntimeException {

	private final String campo;

	public ValidacaoException(String campo, String mensagem) {
		super(mensagem);
		this.campo = campo;
	}

	public String getCampo() {
		return campo;
	}

}
