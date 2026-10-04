package br.com.familyctrl.itens;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Item de uma lista. Tem duas partes:
 * <ul>
 * <li>o planejamento (nome, categoria, quantidade desejada), que permanece entre as compras;</li>
 * <li>o estado da compra em andamento (pego, quantidade pega, preço, marca), zerado ao finalizar a
 * compra ou ao "desmarcar todos".</li>
 * </ul>
 */
@Entity
@Table(name = "itens")
class Item {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "lista_id", nullable = false, updatable = false)
	private Long listaId;

	@Column(name = "categoria_id", nullable = false)
	private Long categoriaId;

	@Column(nullable = false, length = 120)
	private String nome;

	@Column(name = "quantidade_planejada", length = 30)
	private String quantidadePlanejada;

	@Column(nullable = false)
	private boolean pego;

	@Column(name = "pego_por")
	private Long pegoPor;

	@Column(name = "pego_em")
	private Instant pegoEm;

	@Column(name = "quantidade_pega", precision = 10, scale = 3)
	private BigDecimal quantidadePega;

	@Enumerated(EnumType.STRING)
	@Column(name = "tipo_preco", nullable = false, length = 10)
	private TipoPreco tipoPreco = TipoPreco.UNIDADE;

	@Column(precision = 10, scale = 2)
	private BigDecimal preco;

	@Column(length = 60)
	private String marca;

	/** Não planejado: adicionado durante a compra. */
	@Column(nullable = false)
	private boolean extra;

	@Column(name = "adicionado_por", nullable = false, updatable = false)
	private Long adicionadoPor;

	@Column(name = "criado_em", nullable = false, updatable = false)
	private Instant criadoEm;

	@Column(name = "atualizado_em", nullable = false)
	private Instant atualizadoEm;

	protected Item() {
	}

	Item(Long listaId, Long categoriaId, String nome, String quantidadePlanejada, boolean extra,
			Long adicionadoPor) {
		this.listaId = listaId;
		this.categoriaId = categoriaId;
		this.nome = nome;
		this.quantidadePlanejada = quantidadePlanejada;
		this.extra = extra;
		this.adicionadoPor = adicionadoPor;
		this.criadoEm = Instant.now();
		this.atualizadoEm = this.criadoEm;
	}

	void editarPlanejamento(String nome, Long categoriaId, String quantidadePlanejada) {
		this.nome = nome;
		this.categoriaId = categoriaId;
		this.quantidadePlanejada = quantidadePlanejada;
		tocar();
	}

	/**
	 * Marca como pego (ou atualiza os valores de um item já pego). Ao marcar pela primeira vez,
	 * registra quem e quando: é o "quando" que posiciona o item no fim da categoria.
	 */
	void pegar(BigDecimal quantidade, TipoPreco tipo, BigDecimal preco, String marca, Long usuarioId) {
		if (!pego) {
			this.pego = true;
			this.pegoPor = usuarioId;
			this.pegoEm = Instant.now();
		}
		this.quantidadePega = quantidade;
		this.tipoPreco = tipo;
		this.preco = preco;
		this.marca = marca;
		tocar();
	}

	/** Volta ao estado planejado: desmarca e apaga quantidade, preço e marca. */
	void desmarcar() {
		this.pego = false;
		this.pegoPor = null;
		this.pegoEm = null;
		this.quantidadePega = null;
		this.tipoPreco = TipoPreco.UNIDADE;
		this.preco = null;
		this.marca = null;
		tocar();
	}

	/** Item não planejado que passa a fazer parte da lista. */
	void tornarPlanejado() {
		this.extra = false;
		tocar();
	}

	BigDecimal subtotal() {
		return pego ? Valores.subtotal(tipoPreco, preco, quantidadePega) : null;
	}

	private void tocar() {
		this.atualizadoEm = Instant.now();
	}

	Long getId() {
		return id;
	}

	Long getListaId() {
		return listaId;
	}

	Long getCategoriaId() {
		return categoriaId;
	}

	String getNome() {
		return nome;
	}

	String getQuantidadePlanejada() {
		return quantidadePlanejada;
	}

	boolean isPego() {
		return pego;
	}

	Long getPegoPor() {
		return pegoPor;
	}

	Instant getPegoEm() {
		return pegoEm;
	}

	BigDecimal getQuantidadePega() {
		return quantidadePega;
	}

	TipoPreco getTipoPreco() {
		return tipoPreco;
	}

	BigDecimal getPreco() {
		return preco;
	}

	String getMarca() {
		return marca;
	}

	boolean isExtra() {
		return extra;
	}

	Long getAdicionadoPor() {
		return adicionadoPor;
	}

	Instant getCriadoEm() {
		return criadoEm;
	}

	Instant getAtualizadoEm() {
		return atualizadoEm;
	}

}
