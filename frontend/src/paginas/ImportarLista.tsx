import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ApiError } from '../api/cliente';
import { categoriasApi, listasApi } from '../api/endpoints';
import { Botao } from '../components/Botao';
import { AreaTexto, Campo } from '../components/Campo';
import { Carregando, MensagemErro } from '../components/Estados';
import form from '../components/Formulario.module.css';
import { IconeCheck, IconeCopiar } from '../components/Icones';
import { chaves } from '../estado/chaves';
import { lerCsvLista, promptParaIa } from '../util/csvLista';
import estilos from './ImportarLista.module.css';

const EXEMPLO = `nome;categoria;quantidade
Arroz;Mercearia e Alimentos Básicos;5 kg
Banana;Hortifrúti e Congelados;1 dúzia
Sabonete;Higiene Pessoal;`;

/** Até quantos erros de linha mostrar (o resto vira "e mais N"). */
const ERROS_VISIVEIS = 5;

/**
 * Cria uma lista a partir de um texto CSV colado (ex.: gerado por uma IA). O CSV é lido no
 * navegador, que mostra o resumo antes de enviar; a API recebe os itens já estruturados.
 */
export function ImportarLista({ familiaId }: { familiaId: number }) {
  const queryClient = useQueryClient();
  const navegar = useNavigate();
  const [nome, setNome] = useState('');
  const [texto, setTexto] = useState('');
  const [copiado, setCopiado] = useState(false);

  const categorias = useQuery({
    queryKey: chaves.categorias(familiaId),
    queryFn: () => categoriasApi.listar(familiaId),
  });

  const resultado = useMemo(
    () => (categorias.data && texto.trim() ? lerCsvLista(texto, categorias.data) : null),
    [texto, categorias.data],
  );

  const importar = useMutation({
    mutationFn: () => listasApi.importar(familiaId, { nome: nome.trim(), itens: resultado!.itens }),
    onSuccess: (lista) => {
      void queryClient.invalidateQueries({ queryKey: chaves.todasListas });
      navegar(`/listas/${lista.id}/planejar`);
    },
  });

  if (categorias.isPending) return <Carregando linhas={2} />;
  if (categorias.isError) {
    return (
      <MensagemErro erro={categorias.error} aoTentarDeNovo={() => void categorias.refetch()} />
    );
  }

  const prompt = promptParaIa(categorias.data);
  const podeImportar =
    !!nome.trim() && !!resultado && resultado.itens.length > 0 && resultado.erros.length === 0;

  async function copiarPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (podeImportar) importar.mutate();
  }

  const erroApi = importar.error instanceof ApiError ? importar.error : undefined;

  return (
    <>
      <p className={form.texto}>
        Cole uma lista em formato CSV. Não tem uma? Copie o prompt abaixo, cole na IA que você usa
        junto com a sua lista e traga a resposta para cá.
      </p>

      <div className={estilos.bloco}>
        <div className={estilos.blocoCabecalho}>
          <h3 className={estilos.blocoTitulo}>Prompt para a sua IA</h3>
          <Botao pequeno onClick={copiarPrompt}>
            {copiado ? <IconeCheck tamanho={16} /> : <IconeCopiar tamanho={16} />}
            {copiado ? 'Copiado!' : 'Copiar prompt'}
          </Botao>
        </div>
        <details className={estilos.detalhes}>
          <summary>Ver o prompt</summary>
          <pre className={estilos.codigo}>{prompt}</pre>
        </details>
        <span className="sr-only" role="status">
          {copiado ? 'Prompt copiado' : ''}
        </span>
      </div>

      <div className={estilos.bloco}>
        <h3 className={estilos.blocoTitulo}>Formato aceito</h3>
        <pre className={estilos.codigo}>{EXEMPLO}</pre>
        <ul className={estilos.regras}>
          <li>
            Uma linha por item, colunas separadas por <code>;</code> (vírgula também vale). O
            cabeçalho é opcional.
          </li>
          <li>
            <strong>nome</strong> é obrigatório. <strong>quantidade</strong> é opcional (até 30
            caracteres).
          </li>
          <li>
            <strong>categoria</strong> deve ser uma das categorias da família:{' '}
            {categorias.data.map((c) => c.nome).join(', ')}. Vazia ou diferente vai para “Outros”.
          </li>
          <li>Se um campo tiver ponto e vírgula, coloque-o entre aspas duplas.</li>
        </ul>
      </div>

      <form className={form.formulario} onSubmit={enviar}>
        <Campo
          rotulo="Nome da lista importada"
          placeholder="Ex.: Compras do mês"
          maxLength={100}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erroApi?.erroDoCampo('nome')}
        />
        <AreaTexto
          rotulo="Lista em CSV"
          placeholder={EXEMPLO}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          erro={resultado && resultado.erros.length > 0 ? 'Corrija as linhas abaixo.' : undefined}
        />

        {resultado && <Resumo resultado={resultado} />}

        {erroApi && !erroApi.erroDoCampo('nome') && (
          <p className={form.erro} role="alert">
            {erroApi.message}
          </p>
        )}

        <div className={form.acoes}>
          <Botao
            type="submit"
            variante="primario"
            carregando={importar.isPending}
            disabled={!podeImportar}
          >
            Importar lista
          </Botao>
        </div>
      </form>
    </>
  );
}

function Resumo({ resultado }: { resultado: ReturnType<typeof lerCsvLista> }) {
  const { itens, erros, categoriasDesconhecidas } = resultado;
  return (
    <div className={estilos.resumo} aria-live="polite">
      {erros.length === 0 && itens.length > 0 && (
        <p className={estilos.ok}>
          <IconeCheck tamanho={16} />
          {itens.length} {itens.length === 1 ? 'item pronto' : 'itens prontos'} para importar.
        </p>
      )}
      {erros.length === 0 && itens.length === 0 && (
        <p className={estilos.aviso}>Nenhum item encontrado no texto colado.</p>
      )}
      {categoriasDesconhecidas.length > 0 && (
        <p className={estilos.aviso}>
          Categoria não encontrada, os itens vão para “Outros”: {categoriasDesconhecidas.join(', ')}
          .
        </p>
      )}
      {erros.length > 0 && (
        <ul className={estilos.erros}>
          {erros.slice(0, ERROS_VISIVEIS).map((erro) => (
            <li key={`${erro.linha}-${erro.mensagem}`}>
              {erro.linha > 0 ? `Linha ${erro.linha}: ${erro.mensagem}` : erro.mensagem}
            </li>
          ))}
          {erros.length > ERROS_VISIVEIS && <li>E mais {erros.length - ERROS_VISIVEIS}.</li>}
        </ul>
      )}
    </div>
  );
}
