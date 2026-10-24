import type { Categoria, TipoPreco } from '../api/tipos';
import { sugestaoDaQuantidade } from './compra';

/**
 * Leitura de uma lista de compras colada como texto CSV. Formato:
 *
 *   nome;categoria;quantidade;medida
 *   Arroz;Mercearia e Alimentos Básicos;1 pacote;un
 *   Carne moída;Açougue, Embutidos e Peixaria;1 kg;kg
 *
 * - O cabeçalho é opcional (reconhecido quando a 1ª coluna da 1ª linha é "nome").
 * - Separador ";" (recomendado, porque "1,5 kg" tem vírgula); "," e tabulação também valem.
 * - Campos com o separador vão entre aspas duplas; aspas dentro do campo viram "".
 * - Categoria vazia ou desconhecida vai para "Outros". Quantidade é opcional: vale o número dela
 *   ("6 un" → 6, "500 g" → 0,5 kg). Peso num item por unidade é ignorado.
 * - Medida: "un" (por unidade) ou "kg" (por kg). Se vier vazia (CSV antigo, de 3 colunas), é
 *   deduzida da quantidade ("500 g" e "2 kg" são por kg; o resto, por unidade).
 */

export const MAX_ITENS_IMPORTACAO = 300;
const MAX_NOME = 120;
const MAX_QUANTIDADE = 30;

export interface ItemImportado {
  nome: string;
  categoriaId: number;
  /** Na medida do item: "500 g" num item por kg vira 0,5. */
  quantidadePlanejada?: number;
  medida: TipoPreco;
}

const MEDIDAS: Record<string, TipoPreco> = {
  un: 'UNIDADE',
  und: 'UNIDADE',
  unid: 'UNIDADE',
  unidade: 'UNIDADE',
  unidades: 'UNIDADE',
  kg: 'KG',
  quilo: 'KG',
  quilos: 'KG',
};

export interface ErroLinha {
  /** Número da linha no texto colado (começa em 1). */
  linha: number;
  mensagem: string;
}

export interface ResultadoCsv {
  itens: ItemImportado[];
  erros: ErroLinha[];
  /** Categorias escritas no CSV que não existem na família (os itens foram para "Outros"). */
  categoriasDesconhecidas: string[];
}

/** Compara nomes ignorando maiúsculas, acentos e espaços repetidos. */
export function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function escolherSeparador(linha: string) {
  if (linha.includes(';')) return ';';
  if (linha.includes('\t')) return '\t';
  return ',';
}

/** Quebra uma linha em campos, respeitando aspas duplas. */
function dividir(linha: string, separador: string) {
  const campos: string[] = [];
  let atual = '';
  let entreAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (entreAspas) {
      if (c === '"' && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (c === '"') {
        entreAspas = false;
      } else {
        atual += c;
      }
    } else if (c === '"') {
      entreAspas = true;
    } else if (c === separador) {
      campos.push(atual);
      atual = '';
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos.map((campo) => campo.trim());
}

export function lerCsvLista(texto: string, categorias: Categoria[]): ResultadoCsv {
  const porNome = new Map(categorias.map((c) => [normalizar(c.nome), c.id]));
  const outros = categorias.find((c) => c.fixa)?.id ?? categorias[categorias.length - 1]?.id;

  const itens: ItemImportado[] = [];
  const erros: ErroLinha[] = [];
  const desconhecidas = new Map<string, string>();

  const linhas = texto.split(/\r?\n/);
  const primeira = linhas.find((l) => l.trim() && !l.trim().startsWith('```')) ?? '';
  const separador = escolherSeparador(primeira);
  let cabecalhoVisto = false;

  linhas.forEach((bruta, indice) => {
    const linha = bruta.trim();
    // Linhas vazias e as cercas ``` que algumas IAs colocam em volta do CSV são ignoradas
    if (!linha || linha.startsWith('```')) return;
    const [nome = '', categoria = '', quantidade = '', medidaTexto = ''] = dividir(
      linha,
      separador,
    );

    if (!cabecalhoVisto) {
      cabecalhoVisto = true;
      if (normalizar(nome) === 'nome') return;
    }

    const numero = indice + 1;
    if (!nome) {
      erros.push({ linha: numero, mensagem: 'falta o nome do item.' });
      return;
    }
    if (nome.length > MAX_NOME) {
      erros.push({ linha: numero, mensagem: `nome com mais de ${MAX_NOME} caracteres.` });
      return;
    }
    if (quantidade.length > MAX_QUANTIDADE) {
      erros.push({
        linha: numero,
        mensagem: `quantidade com mais de ${MAX_QUANTIDADE} caracteres.`,
      });
      return;
    }

    const sugestao = sugestaoDaQuantidade(quantidade);
    const medida = medidaTexto
      ? MEDIDAS[normalizar(medidaTexto).replace(/\.$/, '')]
      : (sugestao.tipo ?? 'UNIDADE');
    if (!medida) {
      erros.push({ linha: numero, mensagem: `medida "${medidaTexto}" inválida; use un ou kg.` });
      return;
    }

    let categoriaId = porNome.get(normalizar(categoria));
    if (categoriaId === undefined) {
      categoriaId = outros;
      if (categoria) desconhecidas.set(normalizar(categoria), categoria);
    }
    const pesoEmUnidade = sugestao.tipo === 'KG' && medida === 'UNIDADE';
    const quantidadeNumero =
      sugestao.quantidade !== undefined && sugestao.quantidade > 0 && !pesoEmUnidade
        ? Math.round(sugestao.quantidade * 1000) / 1000
        : undefined;
    itens.push({
      nome,
      categoriaId,
      ...(quantidadeNumero !== undefined && { quantidadePlanejada: quantidadeNumero }),
      medida,
    });
  });

  if (itens.length > MAX_ITENS_IMPORTACAO) {
    erros.push({
      linha: 0,
      mensagem: `a lista tem ${itens.length} itens; importe no máximo ${MAX_ITENS_IMPORTACAO} por vez.`,
    });
  }

  return { itens, erros, categoriasDesconhecidas: [...desconhecidas.values()] };
}

/** Prompt para o usuário colar na IA que ele usa, já com as categorias da família. */
export function promptParaIa(categorias: Categoria[]) {
  const nomes = categorias.map((c) => c.nome).join('; ');
  return `Transforme a minha lista de compras abaixo em CSV para eu importar no Family Ctrl.

Regras:
- Responda somente com o CSV, sem explicações e sem bloco de código.
- A primeira linha deve ser exatamente: nome;categoria;quantidade;medida
- Separe as colunas com ponto e vírgula (;). Uma linha por item.
- nome: o produto (até ${MAX_NOME} caracteres).
- categoria: use exatamente um destes nomes: ${nomes}. Se nenhum servir, use Outros.
- quantidade: opcional, texto curto como "2 kg", "6 un" ou "1 pacote" (até ${MAX_QUANTIDADE} caracteres). Deixe vazio se não houver.
- medida: obrigatória, "kg" para o que é pesado e pago por peso (carnes, frutas, frios a granel) ou "un" para o que é vendido por unidade ou pacote.
- Se algum campo tiver ponto e vírgula, coloque-o entre aspas duplas.

Minha lista:
[cole aqui a sua lista]`;
}
