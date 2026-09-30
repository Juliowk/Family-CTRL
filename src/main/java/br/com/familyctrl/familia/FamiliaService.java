package br.com.familyctrl.familia;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.familyctrl.auth.UsuarioService;
import br.com.familyctrl.auth.dto.UsuarioResponse;
import br.com.familyctrl.familia.dto.FamiliaDetalhe;
import br.com.familyctrl.familia.dto.FamiliaResumo;
import br.com.familyctrl.familia.dto.MembroResponse;
import br.com.familyctrl.infra.erro.AcessoNegadoException;
import br.com.familyctrl.infra.erro.ConflitoException;
import br.com.familyctrl.infra.erro.RecursoNaoEncontradoException;

/**
 * Regras de famílias e membros.
 *
 * <p>Regra de autorização: toda operação começa verificando se o usuário é membro da família.
 * Se não for, respondemos 404 (e não 403), para não revelar que a família existe.
 */
@Service
@Transactional
public class FamiliaService {

	private static final String NAO_ENCONTRADA = "Família não encontrada.";

	private static final int MAX_TENTATIVAS_CODIGO = 5;

	private final FamiliaRepository familias;

	private final MembroFamiliaRepository membros;

	private final UsuarioService usuarioService;

	private final GeradorCodigoConvite geradorCodigo;

	FamiliaService(FamiliaRepository familias, MembroFamiliaRepository membros, UsuarioService usuarioService,
			GeradorCodigoConvite geradorCodigo) {
		this.familias = familias;
		this.membros = membros;
		this.usuarioService = usuarioService;
		this.geradorCodigo = geradorCodigo;
	}

	// ---------------------------------------------------------------------------------------------
	// API usada por outros módulos
	// ---------------------------------------------------------------------------------------------

	/**
	 * Garante que o usuário é membro da família; caso contrário lança 404.
	 * Usado pelos módulos de listas e itens antes de qualquer acesso.
	 */
	@Transactional(readOnly = true)
	public void verificarMembro(Long familiaId, Long usuarioId) {
		buscarMembro(familiaId, usuarioId);
	}

	// ---------------------------------------------------------------------------------------------
	// Consultas
	// ---------------------------------------------------------------------------------------------

	@Transactional(readOnly = true)
	public List<FamiliaResumo> listar(Long usuarioId) {
		List<MembroFamilia> participacoes = membros.findByIdUsuarioId(usuarioId);
		if (participacoes.isEmpty()) {
			return List.of();
		}
		List<Long> ids = participacoes.stream().map(MembroFamilia::getFamiliaId).toList();
		Map<Long, Familia> familiasPorId = familias.findAllById(ids)
			.stream()
			.collect(Collectors.toMap(Familia::getId, Function.identity()));
		Map<Long, Long> totais = membros.contarPorFamilia(ids)
			.stream()
			.collect(Collectors.toMap(MembroFamiliaRepository.TotalMembros::getFamiliaId,
					MembroFamiliaRepository.TotalMembros::getTotal));
		return participacoes.stream()
			.map(p -> {
				Familia familia = familiasPorId.get(p.getFamiliaId());
				return new FamiliaResumo(familia.getId(), familia.getNome(), p.getPapel(),
						totais.getOrDefault(familia.getId(), 0L));
			})
			.sorted(Comparator.comparing(FamiliaResumo::nome, String.CASE_INSENSITIVE_ORDER))
			.toList();
	}

	@Transactional(readOnly = true)
	public FamiliaDetalhe detalhar(Long familiaId, Long usuarioId) {
		MembroFamilia eu = buscarMembro(familiaId, usuarioId);
		return montarDetalhe(buscarFamilia(familiaId), eu);
	}

	// ---------------------------------------------------------------------------------------------
	// Criar / entrar
	// ---------------------------------------------------------------------------------------------

	/** Cria a família; quem cria vira ADMIN. */
	public FamiliaResumo criar(Long usuarioId, String nome) {
		Familia familia = familias.save(new Familia(nome.trim(), novoCodigoUnico()));
		membros.save(new MembroFamilia(familia.getId(), usuarioId, Papel.ADMIN));
		return new FamiliaResumo(familia.getId(), familia.getNome(), Papel.ADMIN, 1);
	}

	/** Entra na família pelo código. Se o usuário já é membro, apenas devolve a família. */
	public FamiliaResumo entrar(Long usuarioId, String codigo) {
		Familia familia = familias.findByCodigoConvite(codigo.trim().toUpperCase(Locale.ROOT))
			.orElseThrow(() -> new RecursoNaoEncontradoException("Código de convite inválido."));
		MembroFamilia membro = membros.findById(new MembroFamiliaId(familia.getId(), usuarioId))
			.orElseGet(() -> membros.save(new MembroFamilia(familia.getId(), usuarioId, Papel.MEMBRO)));
		return new FamiliaResumo(familia.getId(), familia.getNome(), membro.getPapel(),
				membros.countByIdFamiliaId(familia.getId()));
	}

	// ---------------------------------------------------------------------------------------------
	// Ações de ADMIN
	// ---------------------------------------------------------------------------------------------

	public FamiliaDetalhe renomear(Long familiaId, Long usuarioId, String nome) {
		MembroFamilia eu = buscarAdmin(familiaId, usuarioId);
		Familia familia = buscarFamilia(familiaId);
		familia.setNome(nome.trim());
		return montarDetalhe(familia, eu);
	}

	/** Gera um novo código; o antigo deixa de funcionar. */
	public FamiliaDetalhe gerarNovoConvite(Long familiaId, Long usuarioId) {
		MembroFamilia eu = buscarAdmin(familiaId, usuarioId);
		Familia familia = buscarFamilia(familiaId);
		familia.setCodigoConvite(novoCodigoUnico());
		return montarDetalhe(familia, eu);
	}

	public FamiliaDetalhe alterarPapel(Long familiaId, Long usuarioId, Long alvoId, Papel novoPapel) {
		MembroFamilia eu = buscarAdmin(familiaId, usuarioId);
		MembroFamilia alvo = buscarAlvo(familiaId, alvoId);
		if (alvo.isAdmin() && novoPapel == Papel.MEMBRO && ehUltimoAdmin(familiaId)) {
			throw new ConflitoException("A família precisa de pelo menos um ADMIN. Promova outro membro antes.");
		}
		alvo.setPapel(novoPapel);
		return montarDetalhe(buscarFamilia(familiaId), eu);
	}

	/** Remove um membro. Remover a si mesmo equivale a sair da família. */
	public void removerMembro(Long familiaId, Long usuarioId, Long alvoId) {
		if (usuarioId.equals(alvoId)) {
			sair(familiaId, usuarioId);
			return;
		}
		buscarAdmin(familiaId, usuarioId);
		membros.delete(buscarAlvo(familiaId, alvoId));
	}

	// ---------------------------------------------------------------------------------------------
	// Sair
	// ---------------------------------------------------------------------------------------------

	/**
	 * Sai da família.
	 * <ul>
	 * <li>Se for o único membro, a família (com listas e itens) é excluída: não sobraria ninguém
	 * para acessá-la.</li>
	 * <li>Se for o último ADMIN e ainda houver outros membros, a saída é bloqueada até promover
	 * alguém.</li>
	 * </ul>
	 */
	public void sair(Long familiaId, Long usuarioId) {
		MembroFamilia eu = buscarMembro(familiaId, usuarioId);
		if (membros.countByIdFamiliaId(familiaId) == 1) {
			membros.delete(eu);
			familias.deleteById(familiaId);
			return;
		}
		if (eu.isAdmin() && ehUltimoAdmin(familiaId)) {
			throw new ConflitoException("Você é o último ADMIN. Promova outro membro antes de sair.");
		}
		membros.delete(eu);
	}

	// ---------------------------------------------------------------------------------------------
	// Auxiliares
	// ---------------------------------------------------------------------------------------------

	private MembroFamilia buscarMembro(Long familiaId, Long usuarioId) {
		return membros.findById(new MembroFamiliaId(familiaId, usuarioId))
			.orElseThrow(() -> new RecursoNaoEncontradoException(NAO_ENCONTRADA));
	}

	private MembroFamilia buscarAdmin(Long familiaId, Long usuarioId) {
		MembroFamilia membro = buscarMembro(familiaId, usuarioId);
		if (!membro.isAdmin()) {
			throw new AcessoNegadoException("Apenas ADMINs podem fazer isso.");
		}
		return membro;
	}

	private MembroFamilia buscarAlvo(Long familiaId, Long alvoId) {
		return membros.findById(new MembroFamiliaId(familiaId, alvoId))
			.orElseThrow(() -> new RecursoNaoEncontradoException("Membro não encontrado."));
	}

	private Familia buscarFamilia(Long familiaId) {
		return familias.findById(familiaId).orElseThrow(() -> new RecursoNaoEncontradoException(NAO_ENCONTRADA));
	}

	private boolean ehUltimoAdmin(Long familiaId) {
		return membros.countByIdFamiliaIdAndPapel(familiaId, Papel.ADMIN) <= 1;
	}

	private String novoCodigoUnico() {
		for (int i = 0; i < MAX_TENTATIVAS_CODIGO; i++) {
			String codigo = geradorCodigo.gerar();
			if (!familias.existsByCodigoConvite(codigo)) {
				return codigo;
			}
		}
		throw new IllegalStateException("Não foi possível gerar um código de convite único.");
	}

	private FamiliaDetalhe montarDetalhe(Familia familia, MembroFamilia eu) {
		List<MembroFamilia> daFamilia = membros.findByIdFamiliaId(familia.getId());
		Map<Long, UsuarioResponse> usuarios = usuarioService
			.buscarPorIds(daFamilia.stream().map(MembroFamilia::getUsuarioId).toList());
		List<MembroResponse> lista = daFamilia.stream()
			.map(m -> {
				UsuarioResponse u = usuarios.get(m.getUsuarioId());
				return new MembroResponse(m.getUsuarioId(), u.nome(), u.email(), m.getPapel(), m.getEntrouEm());
			})
			// ADMINs primeiro, depois por nome
			.sorted(Comparator.comparing(MembroResponse::papel)
				.thenComparing(MembroResponse::nome, String.CASE_INSENSITIVE_ORDER))
			.toList();
		return new FamiliaDetalhe(familia.getId(), familia.getNome(), familia.getCodigoConvite(), eu.getPapel(),
				familia.getCriadoEm(), lista);
	}

}
