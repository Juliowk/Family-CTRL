package br.com.familyctrl.auth;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.familyctrl.auth.dto.CadastroRequest;
import br.com.familyctrl.auth.dto.LoginRequest;
import br.com.familyctrl.auth.dto.TokenResponse;
import br.com.familyctrl.infra.erro.ConflitoException;
import br.com.familyctrl.infra.erro.NaoAutenticadoException;
import br.com.familyctrl.infra.erro.ValidacaoException;

/** Regras de cadastro e login. */
@Service
public class AuthService {

	private final UsuarioRepository repository;

	private final PasswordEncoder passwordEncoder;

	private final TokenService tokenService;

	AuthService(UsuarioRepository repository, PasswordEncoder passwordEncoder, TokenService tokenService) {
		this.repository = repository;
		this.passwordEncoder = passwordEncoder;
		this.tokenService = tokenService;
	}

	/** Cadastra o usuário e já devolve um token, para o front entrar direto após o cadastro. */
	@Transactional
	public TokenResponse cadastrar(CadastroRequest request) {
		if (!request.senha().equals(request.confirmacaoSenha())) {
			throw new ValidacaoException("confirmacaoSenha", "As senhas não conferem.");
		}
		String email = normalizarEmail(request.email());
		if (repository.existsByEmail(email)) {
			throw new ConflitoException("Já existe uma conta com este e-mail.");
		}
		Usuario usuario = repository
			.save(new Usuario(request.nome().trim(), email, passwordEncoder.encode(request.senha())));
		return tokenService.emitir(usuario, false);
	}

	@Transactional(readOnly = true)
	public TokenResponse login(LoginRequest request) {
		Usuario usuario = repository.findByEmail(normalizarEmail(request.email()))
			.filter(u -> passwordEncoder.matches(request.senha(), u.getSenhaHash()))
			// Mesma mensagem para e-mail inexistente e senha errada: não revela quais e-mails existem
			.orElseThrow(() -> new NaoAutenticadoException("E-mail ou senha incorretos."));
		return tokenService.emitir(usuario, request.lembrarDeMim());
	}

	/** E-mails são comparados sem diferenciar maiúsculas de minúsculas. */
	static String normalizarEmail(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

}
