import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError } from '../api/cliente';
import { familiasApi } from '../api/endpoints';
import type { FamiliaDetalhe, Membro, Papel } from '../api/tipos';
import { Botao } from '../components/Botao';
import { Avatar } from '../components/Avatar';
import { CabecalhoPagina } from '../components/CabecalhoPagina';
import { Card } from '../components/Card';
import { ConfirmarDialogo } from '../components/ConfirmarDialogo';
import { Carregando } from '../components/Estados';
import form from '../components/Formulario.module.css';
import { IconeCheck, IconeCopiar, IconeEditar } from '../components/Icones';
import { ModalNome } from '../components/ModalNome';
import { Selo } from '../components/Selo';
import { useAuth } from '../estado/auth';
import { chaves } from '../estado/chaves';
import { esquecerFamiliaAtual } from '../estado/familiaAtual';
import cartoes from './Cartoes.module.css';
import estilos from './FamiliaMembros.module.css';
import paginas from './Paginas.module.css';
import { ErroFamilia } from './FamiliaNaoEncontrada';
import { useFamiliaDaRota } from './useFamiliaDaRota';

type Confirmacao =
  { tipo: 'novoCodigo' } | { tipo: 'sair' } | { tipo: 'remover'; membro: Membro } | null;

const mensagemDe = (erro: unknown) => (erro instanceof ApiError ? erro.message : undefined);

/** Tela da família: código de convite, membros e ações de ADMIN. */
export function FamiliaMembros() {
  const { familiaId, familia } = useFamiliaDaRota();
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const navegar = useNavigate();
  const [renomeando, setRenomeando] = useState(false);
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);
  const [copiado, setCopiado] = useState(false);

  function atualizarCache(detalhe: FamiliaDetalhe) {
    queryClient.setQueryData(chaves.familia(familiaId), detalhe);
    void queryClient.invalidateQueries({ queryKey: chaves.familias, exact: true });
  }

  const renomear = useMutation({
    mutationFn: (nome: string) => familiasApi.renomear(familiaId, nome),
    onSuccess: (detalhe) => {
      atualizarCache(detalhe);
      setRenomeando(false);
    },
  });

  const novoCodigo = useMutation({
    mutationFn: () => familiasApi.novoConvite(familiaId),
    onSuccess: (detalhe) => {
      atualizarCache(detalhe);
      setConfirmacao(null);
    },
  });

  const alterarPapel = useMutation({
    mutationFn: ({ usuarioId, papel }: { usuarioId: number; papel: Papel }) =>
      familiasApi.alterarPapel(familiaId, usuarioId, papel),
    onSuccess: atualizarCache,
  });

  const remover = useMutation({
    mutationFn: (usuarioId: number) => familiasApi.removerMembro(familiaId, usuarioId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.familias });
      setConfirmacao(null);
    },
  });

  const sair = useMutation({
    mutationFn: () => familiasApi.sair(familiaId),
    onSuccess: () => {
      esquecerFamiliaAtual();
      queryClient.removeQueries({ queryKey: chaves.familia(familiaId) });
      void queryClient.invalidateQueries({ queryKey: chaves.familias });
      navegar('/familias');
    },
  });

  if (familia.isPending) return <Carregando />;
  if (familia.isError) {
    return <ErroFamilia erro={familia.error} aoTentarDeNovo={() => void familia.refetch()} />;
  }

  const dados = familia.data;
  const souAdmin = dados.meuPapel === 'ADMIN';

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(dados.codigoConvite);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  function fecharConfirmacao() {
    setConfirmacao(null);
    novoCodigo.reset();
    remover.reset();
    sair.reset();
  }

  return (
    <div className={paginas.pagina}>
      <CabecalhoPagina
        trilha={[
          { rotulo: 'Famílias', para: '/familias' },
          { rotulo: dados.nome, para: `/familias/${familiaId}` },
        ]}
        rotulo="Membros e convite"
        titulo={dados.nome}
        descricao={`${dados.membros.length} ${dados.membros.length === 1 ? 'membro' : 'membros'}`}
        selos={souAdmin && <Selo tom="destaque">Você é ADMIN</Selo>}
        acoes={
          souAdmin && (
            <Botao pequeno onClick={() => setRenomeando(true)}>
              <IconeEditar tamanho={16} />
              Renomear
            </Botao>
          )
        }
      />

      <Card className={estilos.convite}>
        <div className={estilos.conviteTexto}>
          <h2 className={paginas.rotulo}>Código de convite</h2>
          <p className={estilos.codigo}>{dados.codigoConvite}</p>
          <p className={paginas.subtitulo}>
            Quem tiver este código pode entrar na família pela tela “Suas famílias”.
          </p>
        </div>
        <div className={cartoes.cartaoAcoes}>
          <Botao variante="primario" onClick={copiarCodigo}>
            {copiado ? <IconeCheck tamanho={20} /> : <IconeCopiar tamanho={20} />}
            {copiado ? 'Copiado!' : 'Copiar código'}
          </Botao>
          {souAdmin && (
            <Botao onClick={() => setConfirmacao({ tipo: 'novoCodigo' })}>Gerar novo código</Botao>
          )}
        </div>
        <span className="sr-only" role="status">
          {copiado ? 'Código copiado' : ''}
        </span>
      </Card>

      <section className={paginas.secao} aria-labelledby="titulo-membros">
        <h2 id="titulo-membros" className={paginas.secaoTitulo}>
          Membros
        </h2>
        {alterarPapel.isError && (
          <p className={form.erro} role="alert">
            {mensagemDe(alterarPapel.error)}
          </p>
        )}
        <ul className={estilos.membros}>
          {dados.membros.map((membro) => {
            const souEu = membro.usuarioId === usuario?.id;
            return (
              <li key={membro.usuarioId} className={estilos.membro}>
                <div className={estilos.membroInfo}>
                  <Avatar nome={membro.nome} />
                  <div className={estilos.membroTexto}>
                    <span className={estilos.membroNome}>
                      {membro.nome}
                      {souEu && <span className={paginas.subtitulo}> (você)</span>}
                    </span>
                    <span className={cartoes.cartaoMeta}>{membro.email}</span>
                  </div>
                  {membro.papel === 'ADMIN' && <Selo tom="destaque">ADMIN</Selo>}
                </div>
                {souAdmin && !souEu && (
                  <div className={cartoes.cartaoAcoes}>
                    <Botao
                      pequeno
                      carregando={
                        alterarPapel.isPending &&
                        alterarPapel.variables?.usuarioId === membro.usuarioId
                      }
                      onClick={() =>
                        alterarPapel.mutate({
                          usuarioId: membro.usuarioId,
                          papel: membro.papel === 'ADMIN' ? 'MEMBRO' : 'ADMIN',
                        })
                      }
                    >
                      {membro.papel === 'ADMIN' ? 'Tornar membro' : 'Tornar ADMIN'}
                    </Botao>
                    <Botao
                      pequeno
                      variante="perigo"
                      onClick={() => setConfirmacao({ tipo: 'remover', membro })}
                    >
                      Remover
                    </Botao>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className={paginas.zonaRisco} aria-labelledby="titulo-sair">
        <div className={paginas.zonaRiscoTexto}>
          <h2 id="titulo-sair">Sair da família</h2>
          <p className={paginas.subtitulo}>
            Você perde o acesso às listas. Para voltar, precisará de um novo convite.
          </p>
        </div>
        <Botao variante="perigo" onClick={() => setConfirmacao({ tipo: 'sair' })}>
          Sair da família
        </Botao>
      </section>

      <ModalNome
        aberto={renomeando}
        titulo="Renomear família"
        rotulo="Nome da família"
        valorInicial={dados.nome}
        carregando={renomear.isPending}
        erro={mensagemDe(renomear.error)}
        aoSalvar={(nome) => renomear.mutate(nome)}
        aoFechar={() => {
          setRenomeando(false);
          renomear.reset();
        }}
      />

      <ConfirmarDialogo
        aberto={confirmacao?.tipo === 'novoCodigo'}
        titulo="Gerar novo código?"
        mensagem="O código atual deixa de funcionar. Quem já é membro continua na família."
        textoConfirmar="Gerar novo código"
        carregando={novoCodigo.isPending}
        erro={mensagemDe(novoCodigo.error)}
        aoConfirmar={() => novoCodigo.mutate()}
        aoCancelar={fecharConfirmacao}
      />

      <ConfirmarDialogo
        aberto={confirmacao?.tipo === 'remover'}
        titulo="Remover membro?"
        mensagem={
          confirmacao?.tipo === 'remover'
            ? `${confirmacao.membro.nome} perderá o acesso às listas desta família.`
            : ''
        }
        textoConfirmar="Remover"
        carregando={remover.isPending}
        erro={mensagemDe(remover.error)}
        aoConfirmar={() =>
          confirmacao?.tipo === 'remover' && remover.mutate(confirmacao.membro.usuarioId)
        }
        aoCancelar={fecharConfirmacao}
      />

      <ConfirmarDialogo
        aberto={confirmacao?.tipo === 'sair'}
        titulo="Sair da família?"
        mensagem={
          dados.membros.length === 1
            ? 'Você é o único membro: a família e todas as listas serão excluídas.'
            : 'Você perderá o acesso às listas desta família.'
        }
        textoConfirmar="Sair"
        carregando={sair.isPending}
        erro={mensagemDe(sair.error)}
        aoConfirmar={() => sair.mutate()}
        aoCancelar={fecharConfirmacao}
      />
    </div>
  );
}
