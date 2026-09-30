package br.com.familyctrl.familia;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import br.com.familyctrl.auth.UsuarioService;
import br.com.familyctrl.infra.erro.AcessoNegadoException;
import br.com.familyctrl.infra.erro.ConflitoException;
import br.com.familyctrl.infra.erro.RecursoNaoEncontradoException;

/**
 * Testes unitários das regras de negócio de membros. Os repositórios são simulados (mocks),
 * então estes testes rodam em milissegundos, sem banco.
 */
class FamiliaServiceTest {

	private static final Long FAMILIA = 10L;

	private static final Long ANA = 1L;

	private static final Long BIA = 2L;

	private FamiliaRepository familias;

	private MembroFamiliaRepository membros;

	private FamiliaService service;

	@BeforeEach
	void setUp() {
		familias = mock(FamiliaRepository.class);
		membros = mock(MembroFamiliaRepository.class);
		service = new FamiliaService(familias, membros, mock(UsuarioService.class), new GeradorCodigoConvite());
	}

	private MembroFamilia membro(Long usuarioId, Papel papel) {
		MembroFamilia membro = new MembroFamilia(FAMILIA, usuarioId, papel);
		when(membros.findById(new MembroFamiliaId(FAMILIA, usuarioId))).thenReturn(Optional.of(membro));
		return membro;
	}

	@Test
	void ultimoAdminNaoPodeSairSeHouverOutrosMembros() {
		membro(ANA, Papel.ADMIN);
		when(membros.countByIdFamiliaId(FAMILIA)).thenReturn(2L);
		when(membros.countByIdFamiliaIdAndPapel(FAMILIA, Papel.ADMIN)).thenReturn(1L);

		assertThatThrownBy(() -> service.sair(FAMILIA, ANA)).isInstanceOf(ConflitoException.class);
		verify(membros, never()).delete(any());
	}

	@Test
	void adminPodeSairSeHouverOutroAdmin() {
		MembroFamilia ana = membro(ANA, Papel.ADMIN);
		when(membros.countByIdFamiliaId(FAMILIA)).thenReturn(2L);
		when(membros.countByIdFamiliaIdAndPapel(FAMILIA, Papel.ADMIN)).thenReturn(2L);

		assertThatNoException().isThrownBy(() -> service.sair(FAMILIA, ANA));
		verify(membros).delete(ana);
	}

	@Test
	void unicoMembroSaiEAFamiliaEExcluida() {
		membro(ANA, Papel.ADMIN);
		when(membros.countByIdFamiliaId(FAMILIA)).thenReturn(1L);

		service.sair(FAMILIA, ANA);

		verify(familias).deleteById(FAMILIA);
	}

	@Test
	void naoMembroRecebeNaoEncontrado() {
		when(membros.findById(any())).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.verificarMembro(FAMILIA, ANA))
			.isInstanceOf(RecursoNaoEncontradoException.class);
	}

	@Test
	void membroComumNaoPodeRemoverOutros() {
		membro(ANA, Papel.MEMBRO);
		membro(BIA, Papel.MEMBRO);

		assertThatThrownBy(() -> service.removerMembro(FAMILIA, ANA, BIA)).isInstanceOf(AcessoNegadoException.class);
	}

	@Test
	void ultimoAdminNaoPodeSeRebaixar() {
		membro(ANA, Papel.ADMIN);
		when(membros.countByIdFamiliaIdAndPapel(FAMILIA, Papel.ADMIN)).thenReturn(1L);

		assertThatThrownBy(() -> service.alterarPapel(FAMILIA, ANA, ANA, Papel.MEMBRO))
			.isInstanceOf(ConflitoException.class);
	}

}
