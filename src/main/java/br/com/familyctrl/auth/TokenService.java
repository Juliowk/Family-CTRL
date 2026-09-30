package br.com.familyctrl.auth;

import java.time.Instant;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import br.com.familyctrl.auth.dto.TokenResponse;
import br.com.familyctrl.auth.dto.UsuarioResponse;
import br.com.familyctrl.infra.config.JwtProperties;

/**
 * Emite o access token JWT. O "sub" (subject) do token é o id do usuário; é só isso que o
 * backend precisa para saber quem está fazendo a requisição.
 */
@Service
class TokenService {

	private final JwtEncoder encoder;

	private final JwtProperties props;

	TokenService(JwtEncoder encoder, JwtProperties props) {
		this.encoder = encoder;
		this.props = props;
	}

	TokenResponse emitir(Usuario usuario, boolean lembrarDeMim) {
		Instant agora = Instant.now();
		Instant expiraEm = agora.plus(lembrarDeMim ? props.expiracaoLembrar() : props.expiracaoPadrao());
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.issuer(props.issuer())
			.subject(usuario.getId().toString())
			.issuedAt(agora)
			.expiresAt(expiraEm)
			.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
		return new TokenResponse(token, expiraEm,
				new UsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getEmail()));
	}

}
