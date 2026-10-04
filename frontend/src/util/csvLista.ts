import type { Categoria } from '../api/tipos';

/**
 * Leitura de uma lista de compras colada como texto CSV. Formato:
 *
 *   nome;categoria;quantidade
 *   Arroz;Mercearia e Alimentos Básicos;5 kg
 *
 * - O cabeçalho é opcional (reconhecido quando a 1ª coluna da 1ª linha é "nome").
 * - Separador ";" (recomendado, porque "1,5 kg" tem vírgula); "," e tabulação também valem.
 * - Campos com o separador vão entre aspas duplas; aspas dentro do campo viram "".
 * - Categoria vazia ou desconhecida vai para "Outros". Quantidade é opcional.
 */

export const MAX_ITENS_IMPORTACAO = 300;
const MAX_NOME = 120;
const MAX_QUANTIDADE = 30;

export interface ItemImportado {
  nome: string;
  categoriaId: number;
  quantidadePlanejada?: string;
}

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
    const [nome = '', categoria = '', quantidade = ''] = dividir(linha, separador);

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

    let categoriaId = porNome.get(normalizar(categoria));
    if (categoriaId === undefined) {
      categoriaId = outros;
      if (categoria) desconhecidas.set(normalizar(categoria), categoria);
    }
    itens.push({ nome, categoriaId, ...(quantidade && { quantidadePlanejada: quantidade }) });
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
- A primeira linha deve ser exatamente: nome;categoria;quantidade
- Separe as colunas com ponto e vírgula (;). Uma linha por item.
- nome: o produto (até ${MAX_NOME} caracteres).
- categoria: use exatamente um destes nomes: ${nomes}. Se nenhum servir, use Outros.
- quantidade: opcional, texto curto como "2 kg", "6 un" ou "1 pacote" (até ${MAX_QUANTIDADE} caracteres). Deixe vazio se não houver.
- Se algum campo tiver ponto e vírgula, coloque-o entre aspas duplas.

Minha lista:
[cole aqui a sua lista]`;
}
