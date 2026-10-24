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

const EXEMPLO = `Arroz 5 kg;Mercearia;1;un
Banana;Hortifrúti;1,5 kg;kg`;

/** Até quantos erros de linha mostrar (o resto vira "e mais N"). */
const ERROS_VISIVEIS = 5;

/**
 * Cria uma lista a partir de um texto CSV colado (ex.: gerado por uma IA). O CSV é lido no
 * navegador, que mostra o resumo antes de enviar; a API recebe os itens já estruturados.
 *
 * A tela fala com quem nunca viu um CSV: copiar o pedido para a IA e colar a resposta. O formato
 * fica só para quem quiser escrever à mão, num "Sem IA?" fechado.
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
    <form className={form.formulario} onSubmit={enviar}>
      <div className={estilos.passo}>
        <p className={form.texto}>
          Tem a lista no papel ou no WhatsApp? Copie o pedido, cole no ChatGPT, Gemini ou outra IA
          junto com a sua lista e traga a resposta para cá.
        </p>
        <Botao pequeno onClick={copiarPrompt} className={estilos.copiar}>
          {copiado ? <IconeCheck tamanho={16} /> : <IconeCopiar tamanho={16} />}
          {copiado ? 'Copiado!' : 'Copiar pedido para a IA'}
        </Botao>
        <span className="sr-only" role="status">
          {copiado ? 'Pedido copiado' : ''}
        </span>
      </div>

      <AreaTexto
        rotulo="Resposta da IA"
        placeholder="Cole aqui"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        rows={3}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        erro={resultado && resultado.erros.length > 0 ? 'Corrija as linhas abaixo.' : undefined}
      />

      <details className={estilos.detalhes}>
        <summary>Sem IA? Veja como escrever</summary>
        <p className={estilos.ajuda}>
          Um item por linha: nome; categoria; quantidade; medida (<code>un</code> ou <code>kg</code>
          ). Só o nome é obrigatório.
        </p>
        <pre className={estilos.codigo}>{EXEMPLO}</pre>
      </details>

      <Campo
        rotulo="Nome da lista"
        placeholder="Ex.: Compras do mês"
        maxLength={100}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        erro={erroApi?.erroDoCampo('nome')}
      />

      {resultado && <Resumo resultado={resultado} />}

      {erroApi && !erroApi.erroDoCampo('nome') && (
        <p className={form.erro} role="alert">
          {erroApi.message}
        </p>
      )}

      <div className={form.acoes}>
        <Botao type="submit" carregando={importar.isPending} disabled={!podeImportar}>
          Importar lista
        </Botao>
      </div>
    </form>
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
