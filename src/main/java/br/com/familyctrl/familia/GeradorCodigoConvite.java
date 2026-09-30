package br.com.familyctrl.familia;

import java.security.SecureRandom;

import org.springframework.stereotype.Component;

/**
 * Gera códigos de convite curtos e fáceis de digitar. O alfabeto exclui caracteres ambíguos
 * (0/O, 1/I/L). Com 8 caracteres de 31 símbolos há ~850 bilhões de combinações, o que torna
 * inviável adivinhar um código.
 */
@Component
class GeradorCodigoConvite {

	private static final String ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

	private static final int TAMANHO = 8;

	private final SecureRandom random = new SecureRandom();

	String gerar() {
		StringBuilder codigo = new StringBuilder(TAMANHO);
		for (int i = 0; i < TAMANHO; i++) {
			codigo.append(ALFABETO.charAt(random.nextInt(ALFABETO.length())));
		}
		return codigo.toString();
	}

}
