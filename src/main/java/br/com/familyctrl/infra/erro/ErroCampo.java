package br.com.familyctrl.infra.erro;

/** Um erro de validação de um campo específico, incluído no ProblemDetail na propriedade "erros". */
public record ErroCampo(String campo, String mensagem) {
}
