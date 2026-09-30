package br.com.familyctrl.infra.seguranca;

import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import br.com.familyctrl.infra.erro.NaoAutenticadoException;

/** Preenche parâmetros do tipo {@link UsuarioLogado} a partir do "sub" (id do usuário) do JWT. */
class UsuarioLogadoArgumentResolver implements HandlerMethodArgumentResolver {

	@Override
	public boolean supportsParameter(MethodParameter parameter) {
		return parameter.getParameterType().equals(UsuarioLogado.class);
	}

	@Override
	public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
			NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
		Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();
		if (autenticacao != null && autenticacao.getPrincipal() instanceof Jwt jwt) {
			try {
				return new UsuarioLogado(Long.valueOf(jwt.getSubject()));
			}
			catch (NumberFormatException ex) {
				throw new NaoAutenticadoException("Token inválido.");
			}
		}
		throw new NaoAutenticadoException("Autenticação necessária.");
	}

}
