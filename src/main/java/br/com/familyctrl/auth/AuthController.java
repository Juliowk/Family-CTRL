package br.com.familyctrl.auth;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.com.familyctrl.auth.dto.CadastroRequest;
import br.com.familyctrl.auth.dto.LoginRequest;
import br.com.familyctrl.auth.dto.TokenResponse;
import br.com.familyctrl.auth.dto.UsuarioResponse;
import br.com.familyctrl.infra.seguranca.UsuarioLogado;

@RestController
@RequestMapping("/api/auth")
class AuthController {

	private final AuthService authService;

	private final UsuarioService usuarioService;

	AuthController(AuthService authService, UsuarioService usuarioService) {
		this.authService = authService;
		this.usuarioService = usuarioService;
	}

	@PostMapping("/cadastro")
	@ResponseStatus(HttpStatus.CREATED)
	TokenResponse cadastrar(@Valid @RequestBody CadastroRequest request) {
		return authService.cadastrar(request);
	}

	@PostMapping("/login")
	TokenResponse login(@Valid @RequestBody LoginRequest request) {
		return authService.login(request);
	}

	@GetMapping("/me")
	UsuarioResponse me(UsuarioLogado usuario) {
		return usuarioService.buscarAutenticado(usuario.id());
	}

}
