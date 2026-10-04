import { describe, expect, it } from 'vitest';
import type { Categoria } from '../api/tipos';
import { lerCsvLista, promptParaIa } from './csvLista';

const CATEGORIAS: Categoria[] = [
  { id: 1, nome: 'Padaria', ordem: 1, fixa: false },
  { id: 2, nome: 'Hortifrúti e Congelados', ordem: 2, fixa: false },
  { id: 3, nome: 'Outros', ordem: 3, fixa: true },
];

describe('lerCsvLista', () => {
  it('lê cabeçalho, categorias (sem diferenciar acento e maiúscula) e quantidade opcional', () => {
    const r = lerCsvLista(
      'nome;categoria;quantidade\nPão francês;padaria;6 un\nBanana;HORTIFRUTI E CONGELADOS;1,5 kg\nBolo;Padaria;',
      CATEGORIAS,
    );
    expect(r.erros).toEqual([]);
    expect(r.itens).toEqual([
      { nome: 'Pão francês', categoriaId: 1, quantidadePlanejada: '6 un', medida: 'UNIDADE' },
      { nome: 'Banana', categoriaId: 2, quantidadePlanejada: '1,5 kg', medida: 'KG' },
      { nome: 'Bolo', categoriaId: 1, medida: 'UNIDADE' },
    ]);
  });

  it('sem cabeçalho, com vírgula, aspas e cercas de código', () => {
    const r = lerCsvLista(
      '```csv\n"Biscoito ""recheado"", chocolate",Padaria,2\nLeite\n```',
      CATEGORIAS,
    );
    expect(r.itens).toEqual([
      {
        nome: 'Biscoito "recheado", chocolate',
        categoriaId: 1,
        quantidadePlanejada: '2',
        medida: 'UNIDADE',
      },
      { nome: 'Leite', categoriaId: 3, medida: 'UNIDADE' },
    ]);
  });

  it('lê a coluna de medida (un ou kg) e recusa medida desconhecida', () => {
    const r = lerCsvLista(
      'nome;categoria;quantidade;medida\nFrango;Padaria;2 un;KG\nPão;Padaria;500 g;un\nSuco;Padaria;;litro',
      CATEGORIAS,
    );
    expect(r.itens.map((i) => [i.nome, i.medida])).toEqual([
      ['Frango', 'KG'],
      ['Pão', 'UNIDADE'],
    ]);
    expect(r.erros).toEqual([{ linha: 4, mensagem: 'medida "litro" inválida; use un ou kg.' }]);
  });

  it('categoria desconhecida vai para Outros e é informada', () => {
    const r = lerCsvLista('Cerveja;Bebidas;12 un\nVinho;bebidas', CATEGORIAS);
    expect(r.itens.map((i) => i.categoriaId)).toEqual([3, 3]);
    expect(r.categoriasDesconhecidas).toEqual(['bebidas']);
  });

  it('aponta a linha de cada erro', () => {
    const r = lerCsvLista(`nome;categoria\n;Padaria\nPão;Padaria;${'x'.repeat(31)}`, CATEGORIAS);
    expect(r.itens).toEqual([]);
    expect(r.erros).toEqual([
      { linha: 2, mensagem: 'falta o nome do item.' },
      { linha: 3, mensagem: 'quantidade com mais de 30 caracteres.' },
    ]);
  });

  it('o prompt lista as categorias da família', () => {
    expect(promptParaIa(CATEGORIAS)).toContain('Padaria; Hortifrúti e Congelados; Outros');
    expect(promptParaIa(CATEGORIAS)).toContain('nome;categoria;quantidade;medida');
  });
});
