import { LinkBotao } from '../components/Botao';
import {
  IconeCarrinho,
  IconeCheck,
  IconeFamilia,
  IconeSeta,
  IconeTrocar,
} from '../components/Icones';
import { Selo } from '../components/Selo';
import estilos from './Landing.module.css';

const PASSOS = [
  { titulo: 'Crie a família', texto: 'Dê um nome, como “Casa da Ana”. Você vira o administrador.' },
  {
    titulo: 'Convide com o código',
    texto: 'Cada família tem um código curto. Quem digitar, entra.',
  },
  {
    titulo: 'Marque no mercado',
    texto: 'Um toque marca o item como comprado, com o nome de quem marcou.',
  },
];

const RECURSOS = [
  {
    icone: <IconeCarrinho />,
    titulo: 'Listas compartilhadas',
    texto: 'Mercado, feira, farmácia: todos da família adicionam e editam as mesmas listas.',
  },
  {
    icone: <IconeCheck />,
    titulo: 'Um toque para marcar',
    texto: 'A linha inteira do item é o botão. Dá para usar com uma mão, empurrando o carrinho.',
  },
  {
    icone: <IconeFamilia />,
    titulo: 'Quem comprou o quê',
    texto: 'Cada item marcado mostra quem marcou. Ninguém compra o leite duas vezes.',
  },
  {
    icone: <IconeTrocar />,
    titulo: 'Várias famílias',
    texto: 'Sua casa, a casa dos pais, a república: participe de quantas quiser e alterne.',
  },
];

const DADOS = [
  { numero: '1 toque', texto: 'para marcar ou desmarcar um item como comprado' },
  { numero: '8 caracteres', texto: 'no código de convite, sem letras e números que se confundem' },
  { numero: '320 px', texto: 'é a menor tela suportada: o app foi feito primeiro para o celular' },
];

const PERGUNTAS = [
  {
    pergunta: 'Preciso instalar alguma coisa?',
    resposta: 'Não. O Family Ctrl funciona no navegador do celular ou do computador.',
  },
  {
    pergunta: 'Como alguém entra na minha família?',
    resposta:
      'Na tela da família há um código de convite com botão de copiar. A pessoa cria a conta e informa o código em “Entrar com código”.',
  },
  {
    pergunta: 'As mudanças aparecem na hora para todo mundo?',
    resposta:
      'Elas aparecem quando a outra pessoa abre a lista ou volta para o app. Não há atualização em tempo real nesta versão.',
  },
  {
    pergunta: 'O que acontece se eu sair da família?',
    resposta:
      'Você perde o acesso às listas dela. Se for o único administrador, promova outro membro antes de sair.',
  },
];

/** Demonstração estática de uma lista (ilustrativa, sem dados reais). */
function Demonstracao() {
  const itens = [
    { nome: 'Leite integral', detalhe: '2 caixas', comprado: true, por: 'Ana' },
    { nome: 'Pão de forma', detalhe: 'integral', comprado: true, por: 'Rui' },
    { nome: 'Café', detalhe: '500 g', comprado: false },
    { nome: 'Bananas', detalhe: '1 dúzia', comprado: false },
  ];
  return (
    <figure className={estilos.demo}>
      <div className={estilos.demoJanela} aria-hidden="true">
        <div className={estilos.demoCabecalho}>
          <span className={estilos.demoRotulo}>Casa da Ana</span>
          <span className={estilos.demoTitulo}>Mercado da semana</span>
          <span className={estilos.demoProgresso}>
            <span>2 de 4 comprados</span>
            <span className={estilos.demoBarra}>
              <span />
            </span>
          </span>
        </div>
        <ul className={estilos.demoItens}>
          {itens.map((item) => (
            <li key={item.nome} data-comprado={item.comprado}>
              <span className={estilos.demoMarcador}>
                {item.comprado && <IconeCheck tamanho={16} />}
              </span>
              <span className={estilos.demoTexto}>
                <span className={estilos.demoNome}>{item.nome}</span>
                <span className={estilos.demoDetalhe}>
                  {item.comprado ? `Comprado por ${item.por}` : item.detalhe}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption>Exemplo ilustrativo de uma lista compartilhada.</figcaption>
    </figure>
  );
}

export function Landing() {
  return (
    <>
      <section className={estilos.heroi} aria-labelledby="titulo-heroi">
        <div className={[estilos.container, estilos.heroiGrade].join(' ')}>
          <div className={estilos.heroiTexto}>
            <Selo tom="destaque" ponto>
              Listas de compras em família
            </Selo>
            <h1 id="titulo-heroi" className={estilos.heroiTitulo}>
              As compras da casa, organizadas em família.
            </h1>
            <p className={estilos.lead}>
              Todo mundo adiciona o que falta. Quem estiver no mercado marca com um toque, e a
              família vê o que já foi comprado.
            </p>
            <div className={estilos.heroiAcoes}>
              <LinkBotao to="/cadastro" variante="primario">
                Criar conta grátis
                <IconeSeta tamanho={20} />
              </LinkBotao>
              <LinkBotao to="/login">Já tenho conta</LinkBotao>
            </div>
            <ul className={estilos.selos} aria-label="Destaques">
              <li>Funciona no navegador</li>
              <li>Feito para o celular</li>
              <li>Código aberto</li>
            </ul>
          </div>
          <Demonstracao />
        </div>
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-passos">
        <div className={estilos.container}>
          <div className={estilos.cabecalhoSecao}>
            <p className={estilos.rotulo}>Como funciona</p>
            <h2 id="titulo-passos">Três passos até a primeira compra juntos.</h2>
          </div>
          <ol className={estilos.passos}>
            {PASSOS.map((passo, indice) => (
              <li key={passo.titulo} className={estilos.passo}>
                <span className={estilos.passoNumero}>{String(indice + 1).padStart(2, '0')}</span>
                <h3>{passo.titulo}</h3>
                <p>{passo.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className={[estilos.secao, estilos.secaoAlternada].join(' ')}
        aria-labelledby="titulo-recursos"
      >
        <div className={estilos.container}>
          <div className={estilos.cabecalhoSecao}>
            <p className={estilos.rotulo}>Recursos</p>
            <h2 id="titulo-recursos">
              Pensado para quem faz a compra, não para quem faz a planilha.
            </h2>
          </div>
          <ul className={estilos.recursos}>
            {RECURSOS.map((recurso) => (
              <li key={recurso.titulo} className={estilos.recurso}>
                <span className={estilos.recursoIcone} aria-hidden="true">
                  {recurso.icone}
                </span>
                <h3>{recurso.titulo}</h3>
                <p>{recurso.texto}</p>
              </li>
            ))}
          </ul>
          <dl className={estilos.dados}>
            {DADOS.map((dado) => (
              <div key={dado.numero} className={estilos.dado}>
                <dt>{dado.texto}</dt>
                <dd>{dado.numero}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className={estilos.secao} aria-labelledby="titulo-faq">
        <div className={[estilos.container, estilos.faqGrade].join(' ')}>
          <div className={estilos.cabecalhoSecao}>
            <p className={estilos.rotulo}>Perguntas frequentes</p>
            <h2 id="titulo-faq">O que perguntam antes de começar.</h2>
          </div>
          <div className={estilos.faq}>
            {PERGUNTAS.map((item) => (
              <details key={item.pergunta}>
                <summary>{item.pergunta}</summary>
                <p>{item.resposta}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={estilos.secaoFinal} aria-labelledby="titulo-final">
        <div className={estilos.container}>
          <div className={estilos.chamada}>
            <h2 id="titulo-final">A próxima compra já pode ser em família.</h2>
            <p>Crie a conta, monte a primeira lista e mande o código para quem mora com você.</p>
            <LinkBotao to="/cadastro" variante="primario">
              Criar conta grátis
              <IconeSeta tamanho={20} />
            </LinkBotao>
          </div>
        </div>
      </section>
    </>
  );
}
