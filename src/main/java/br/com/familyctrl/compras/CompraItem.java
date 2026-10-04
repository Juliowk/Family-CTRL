package br.com.familyctrl.compras;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import br.com.familyctrl.itens.TipoPreco;

/** Item como estava no momento da compra (inclusive os que não foram pegos). */
@Entity
@Table(name = "compra_itens")
class CompraItem {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** Só leitura: quem grava a coluna é a relação em {@link Compra}. Usado nas contagens. */
	@Column(name = "compra_id", insertable = false, updatable = false)
	private Long compraId;

	@Column(nullable = false, length = 120)
	private String nome;

	@Column(nullable = false, length = 50)
	private String categoria;

	@Column(name = "categoria_ordem", nullable = false)
	private int categoriaOrdem;

	@Column(name = "quantidade_planejada", length = 30)
	private String quantidadePlanejada;

	@Column(nullable = false)
	private boolean pego;

	@Column(name = "quantidade_pega", precision = 10, scale = 3)
	private BigDecimal quantidadePega;

	@Enumerated(EnumType.STRING)
	@Column(name = "tipo_preco", nullable = false, length = 10)
	private TipoPreco tipoPreco;

	@Column(precision = 10, scale = 2)
	private BigDecimal preco;

	@Column(precision = 10, scale = 2)
	private BigDecimal subtotal;

	@Column(length = 60)
	private String marca;

	@Column(nullable = false)
	private boolean extra;

	protected CompraItem() {
	}

	CompraItem(String nome, String categoria, int categoriaOrdem, String quantidadePlanejada, boolean pego,
			BigDecimal quantidadePega, TipoPreco tipoPreco, BigDecimal preco, BigDecimal subtotal, String marca,
			boolean extra) {
		this.nome = nome;
		this.categoria = categoria;
		this.categoriaOrdem = categoriaOrdem;
		this.quantidadePlanejada = quantidadePlanejada;
		this.pego = pego;
		this.quantidadePega = quantidadePega;
		this.tipoPreco = tipoPreco;
		this.preco = preco;
		this.subtotal = subtotal;
		this.marca = marca;
		this.extra = extra;
	}

	Long getId() {
		return id;
	}

	String getNome() {
		return nome;
	}

	String getCategoria() {
		return categoria;
	}

	int getCategoriaOrdem() {
		return categoriaOrdem;
	}

	String getQuantidadePlanejada() {
		return quantidadePlanejada;
	}

	boolean isPego() {
		return pego;
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

	BigDecimal getSubtotal() {
		return subtotal;
	}

	String getMarca() {
		return marca;
	}

	boolean isExtra() {
		return extra;
	}

}
