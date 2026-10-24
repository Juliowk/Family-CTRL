package br.com.familyctrl.sugestoes;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * Limite de consultas à IA por usuário na última hora, para ninguém gastar de propósito a cota
 * gratuita da família inteira. Fica em memória: se o dyno reiniciar, a contagem recomeça, o que
 * não é problema para um limite de proteção.
 */
@Component
class LimiteDeConsultas {

	private static final Duration JANELA = Duration.ofHours(1);

	private final Map<Long, Deque<Instant>> consultas = new ConcurrentHashMap<>();

	/** Registra a consulta e diz se ela cabe no limite. */
	boolean permitir(Long usuarioId, int limitePorHora) {
		Instant agora = Instant.now();
		Deque<Instant> doUsuario = consultas.computeIfAbsent(usuarioId, id -> new ArrayDeque<>());
		synchronized (doUsuario) {
			while (!doUsuario.isEmpty() && doUsuario.peekFirst().isBefore(agora.minus(JANELA))) {
				doUsuario.pollFirst();
			}
			if (doUsuario.size() >= limitePorHora) {
				return false;
			}
			doUsuario.addLast(agora);
			return true;
		}
	}

}
