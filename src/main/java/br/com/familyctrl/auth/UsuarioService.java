package br.com.familyctrl.auth;

import java.util.Collection;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.familyctrl.auth.dto.UsuarioResponse;
import br.com.familyctrl.infra.erro.NaoAutenticadoException;

/**
 * Consulta de usuários. É a porta de entrada dos outros módulos para dados de usuário
 * (eles nunca usam o {@link UsuarioRepository} diretamente).
 */
@Service
@Transactional(readOnly = true)
public class UsuarioService {

	private final UsuarioRepository repository;

	UsuarioService(UsuarioRepository repository) {
		this.repository = repository;
	}

	/** Usuário do token. Se ele não existe mais, o token não serve: responde 401. */
	public UsuarioResponse buscarAutenticado(Long id) {
		return repository.findById(id)
			.map(UsuarioService::paraResponse)
			.orElseThrow(() -> new NaoAutenticadoException("Usuário não encontrado."));
	}

	/** Dados de vários usuários de uma vez (evita uma consulta por usuário). */
	public Map<Long, UsuarioResponse> buscarPorIds(Collection<Long> ids) {
		return repository.findAllById(ids)
			.stream()
			.collect(Collectors.toMap(Usuario::getId, UsuarioService::paraResponse));
	}

	private static UsuarioResponse paraResponse(Usuario usuario) {
		return new UsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getEmail());
	}

}
