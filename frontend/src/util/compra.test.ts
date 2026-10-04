import { describe, expect, it } from 'vitest';
import type { Categoria, Item } from '../api/tipos';
import {
  agruparPorCategoria,
  hoje,
  lerDecimal,
  subtotal,
  sugestaoDaQuantidade,
  totalDaCompra,
} from './compra';

function item(dados: Partial<Item>): Item {
  return {
    id: 1,
    listaId: 1,
    categoriaId: 1,
    nome: 'Item',
    quantidadePlanejada: null,
    versao: 0,
    medida: 'UNIDADE',
    pego: false,
    pegoEm: null,
    pegoPor: null,
    quantidadePega: null,
    tipoPreco: 'UNIDADE',
    preco: null,
    subtotal: null,
    marca: null,
    extra: false,
    adicionadoPor: { id: 1, nome: 'Ana' },
    criadoEm: '2026-10-01T10:00:00Z',
    atualizadoEm: '2026-10-01T10:00:00Z',
    ...dados,
  };
}

describe('lerDecimal', () => {
  it('entende vírgula decimal, milhar e símbolo de moeda', () => {
    expect(lerDecimal('7,88')).toBe(7.88);
    expect(lerDecimal('1.250,5')).toBe(1250.5);
    expect(lerDecimal('R$ 3,90')).toBe(3.9);
    expect(lerDecimal('1.25')).toBe(1.25);
    expect(lerDecimal('')).toBeUndefined();
    expect(lerDecimal('abc')).toBeUndefined();
  });
});

describe('subtotal', () => {
  it('segue a mesma regra do backend', () => {
    expect(subtotal('UNIDADE', 7.88, 4)).toBe(31.52);
    expect(subtotal('UNIDADE', 3.9, null)).toBe(3.9);
    expect(subtotal('UNIDADE', 6.9, 1.255)).toBe(8.66);
    // Por kg o preço é o total pago pelo peso: 1 kg por R$ 50,00 = R$ 50,00
    expect(subtotal('KG', 50, 1)).toBe(50);
    expect(subtotal('KG', 8.63, 1.25)).toBe(8.63);
    expect(subtotal('KG', 8.63, null)).toBe(8.63);
    expect(subtotal('KG', null, 2)).toBeUndefined();
    expect(subtotal('UNIDADE', null, 2)).toBeUndefined();
  });
});

describe('totalDaCompra', () => {
  it('soma só os pegos com valor e conta os sem valor', () => {
    const itens = [
      item({ pego: true, preco: 10, quantidadePega: 2 }),
      item({ pego: true }),
      item({ pego: false, preco: 99 }),
    ];
    expect(totalDaCompra(itens)).toEqual({ total: 20, semValor: 1 });
  });
});

describe('sugestaoDaQuantidade', () => {
  it('extrai número e tipo da quantidade planejada', () => {
    expect(sugestaoDaQuantidade('2 kg')).toEqual({ quantidade: 2, tipo: 'KG' });
    expect(sugestaoDaQuantidade('500 g')).toEqual({ quantidade: 0.5, tipo: 'KG' });
    expect(sugestaoDaQuantidade('6 un')).toEqual({ quantidade: 6, tipo: undefined });
    expect(sugestaoDaQuantidade('bastante')).toEqual({ quantidade: undefined, tipo: undefined });
  });
});

describe('agruparPorCategoria', () => {
  const categorias: Categoria[] = [
    { id: 1, nome: 'Padaria', ordem: 1, fixa: false },
    { id: 2, nome: 'Limpeza', ordem: 2, fixa: false },
    { id: 3, nome: 'Outros', ordem: 3, fixa: true },
  ];

  it('na compra, os pegos vão para o fim da categoria na ordem em que foram pegos', () => {
    const itens = [
      item({ id: 1, nome: 'Pão', pego: true, pegoEm: '2026-10-01T11:00:00Z' }),
      item({ id: 2, nome: 'Bolo' }),
      item({ id: 3, nome: 'Rosca', pego: true, pegoEm: '2026-10-01T10:30:00Z' }),
      item({ id: 4, nome: 'Sabão', categoriaId: 2 }),
    ];
    const grupos = agruparPorCategoria(categorias, itens, 'comprar');
    expect(grupos.map((g) => g.categoria.nome)).toEqual(['Padaria', 'Limpeza']);
    expect(grupos[0].itens.map((i) => i.nome)).toEqual(['Bolo', 'Rosca', 'Pão']);
  });
});

describe('hoje', () => {
  it('usa a data local do usuário', () => {
    expect(hoje(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
