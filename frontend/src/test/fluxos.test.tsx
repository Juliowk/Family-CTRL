import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { lerToken } from '../api/token';
import { criarApiFalsa, novoItem, SENHA_CORRETA } from './apiFalsa';
import { renderizarApp } from './renderizar';

describe('login', () => {
  it('entra com e-mail e senha e abre as famílias do usuário', async () => {
    criarApiFalsa();
    const { usuario } = renderizarApp('/login');

    await usuario.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await usuario.type(screen.getByLabelText('Senha'), SENHA_CORRETA);
    await usuario.click(screen.getByLabelText(/lembrar de mim/i));
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Suas famílias' })).toBeInTheDocument();
    expect(await screen.findByText('Casa da Ana')).toBeInTheDocument();
    expect(lerToken()).toBe('token-de-teste');
  });

  it('envia "lembrar de mim" para a API', async () => {
    const { chamadas } = criarApiFalsa();
    const { usuario } = renderizarApp('/login');

    await usuario.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await usuario.type(screen.getByLabelText('Senha'), SENHA_CORRETA);
    await usuario.click(screen.getByLabelText(/lembrar de mim/i));
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(chamadas.find((c) => c.caminho === '/api/auth/login')?.corpo).toMatchObject({
        lembrarDeMim: true,
      }),
    );
  });

  it('mostra erro com senha incorreta', async () => {
    criarApiFalsa();
    const { usuario } = renderizarApp('/login');

    await usuario.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await usuario.type(screen.getByLabelText('Senha'), 'senha-errada');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(lerToken()).toBeNull();
  });

  it('com token expirado volta para o login', async () => {
    const { estado } = criarApiFalsa();
    estado.tokenExpirado = true;
    renderizarApp('/familias', { logado: true });

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    expect(lerToken()).toBeNull();
  });

  it('sem token, páginas internas levam ao login', async () => {
    criarApiFalsa();
    renderizarApp('/listas/100');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });
});

describe('cadastro', () => {
  it('valida senha curta e confirmação diferente antes de chamar a API', async () => {
    const { chamadas } = criarApiFalsa();
    const { usuario } = renderizarApp('/cadastro');

    await usuario.type(screen.getByLabelText('Nome'), 'Ana');
    await usuario.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await usuario.type(screen.getByLabelText('Senha'), 'curta');
    await usuario.type(screen.getByLabelText('Confirme a senha'), 'outra');
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(screen.getByText('A senha deve ter pelo menos 8 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument();
    expect(chamadas.some((c) => c.caminho === '/api/auth/cadastro')).toBe(false);
  });
});

describe('navegação', () => {
  it('sem família escolhida mostra só a conta, sem a navegação da família', async () => {
    criarApiFalsa();
    renderizarApp('/familias', { logado: true });

    expect(await screen.findByRole('heading', { name: 'Suas famílias' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Conta' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navegação rápida' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Navegação principal' }),
    ).not.toBeInTheDocument();
  });

  it('com família escolhida mostra a navegação da família, com "ctrl" no início', async () => {
    criarApiFalsa();
    renderizarApp('/familias/10', { logado: true });

    expect(await screen.findByRole('heading', { name: 'Casa da Ana' })).toBeInTheDocument();
    const barra = screen.getByRole('navigation', { name: 'Navegação rápida' });
    expect(within(barra).getByRole('link', { name: 'ctrl' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(barra).queryByRole('link', { name: 'Listas' })).not.toBeInTheDocument();
  });
});

describe('funcionalidades', () => {
  it('mostra os cards e troca pela funcionalidade escolhida, na mesma página', async () => {
    criarApiFalsa();
    const { usuario } = renderizarApp('/familias/10', { logado: true });

    expect(await screen.findByRole('heading', { name: 'Funcionalidades' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Listas' })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Listas de compras/ }));

    // A seção dos cards dá lugar às listas; a família continua na tela
    expect(await screen.findByRole('heading', { name: 'Listas' })).toHaveFocus();
    expect(screen.getByRole('heading', { name: 'Casa da Ana' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Funcionalidades' })).not.toBeInTheDocument();
    expect(await screen.findByText('Mercado')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Funcionalidades' }));
    expect(await screen.findByRole('heading', { name: 'Funcionalidades' })).toHaveFocus();
    expect(screen.queryByRole('heading', { name: 'Listas' })).not.toBeInTheDocument();
  });

  it('o "ctrl" da barra volta para os cards', async () => {
    criarApiFalsa();
    const { usuario } = renderizarApp('/familias/10?ctrl=listas', { logado: true });

    expect(await screen.findByRole('heading', { name: 'Listas' })).toBeInTheDocument();
    const barra = screen.getByRole('navigation', { name: 'Navegação rápida' });
    await usuario.click(within(barra).getByRole('link', { name: 'ctrl' }));

    expect(await screen.findByRole('heading', { name: 'Funcionalidades' })).toBeInTheDocument();
  });
});

describe('listas', () => {
  it('cria uma lista e abre o planejamento dela', async () => {
    const { chamadas } = criarApiFalsa();
    const { usuario } = renderizarApp('/familias/10', { logado: true });

    expect(await screen.findByRole('heading', { name: 'Casa da Ana' })).toBeInTheDocument();
    await usuario.click(await screen.findByRole('button', { name: /Listas de compras/ }));
    expect(await screen.findByText('Mercado')).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Nome da nova lista'), 'Feira');
    await usuario.click(screen.getByRole('button', { name: 'Criar lista' }));

    expect(await screen.findByRole('heading', { name: 'Feira' })).toBeInTheDocument();
    expect(screen.getByText('Nenhum item planejado')).toBeInTheDocument();
    expect(chamadas).toContainEqual(
      expect.objectContaining({
        metodo: 'POST',
        caminho: '/api/familias/10/listas',
        corpo: { nome: 'Feira' },
      }),
    );
  });

  it('importa uma lista colada em CSV', async () => {
    const { chamadas } = criarApiFalsa();
    const { usuario } = renderizarApp('/familias/10?ctrl=listas', { logado: true });

    await usuario.click(await screen.findByRole('tab', { name: 'Importar' }));
    expect(await screen.findByRole('button', { name: 'Copiar prompt' })).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Nome da lista importada'), 'Feira');
    await usuario.type(
      screen.getByLabelText('Lista em CSV'),
      'nome;categoria;quantidade{Enter}Pão;padaria;6 un{Enter}Cerveja;Bebidas;',
    );
    expect(screen.getByText('2 itens prontos para importar.')).toBeInTheDocument();
    expect(screen.getByText(/os itens vão para “Outros”: Bebidas/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Importar lista' }));

    expect(await screen.findByRole('heading', { name: 'Feira' })).toBeInTheDocument();
    expect(screen.getByText('Pão')).toBeInTheDocument();
    expect(chamadas).toContainEqual(
      expect.objectContaining({
        metodo: 'POST',
        caminho: '/api/familias/10/listas/importar',
        corpo: {
          nome: 'Feira',
          itens: [
            { nome: 'Pão', categoriaId: 1, quantidadePlanejada: '6 un', medida: 'UNIDADE' },
            { nome: 'Cerveja', categoriaId: 3, medida: 'UNIDADE' },
          ],
        },
      }),
    );
  });

  it('mostra estado vazio quando a família não tem listas', async () => {
    const { estado } = criarApiFalsa();
    estado.listas = [];
    renderizarApp('/familias/10?ctrl=listas', { logado: true });

    expect(await screen.findByText('Nenhuma lista ainda')).toBeInTheDocument();
  });
});

describe('planejar', () => {
  it('sem aba na URL, a lista abre em Comprar', async () => {
    criarApiFalsa();
    renderizarApp('/listas/100', { logado: true });

    expect(await screen.findByRole('link', { name: 'Comprar' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByLabelText('Item')).not.toBeInTheDocument();
  });

  it('adiciona item com categoria, medida e quantidade, agrupado pela categoria', async () => {
    const { chamadas } = criarApiFalsa();
    const { usuario } = renderizarApp('/listas/100/planejar', { logado: true });

    await usuario.type(await screen.findByLabelText('Item'), 'Bananas');
    await usuario.click(screen.getByRole('radio', { name: 'Hortifrúti e Congelados' }));
    await usuario.click(screen.getByRole('button', { name: 'Por kg' }));
    await usuario.type(screen.getByLabelText('Quantidade (opcional)'), '1 dúzia');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar' }));

    const grupo = await screen.findByRole('region', { name: /Hortifrúti e Congelados/ });
    expect(within(grupo).getByText('Bananas')).toBeInTheDocument();
    expect(within(grupo).getByText('1 dúzia · por kg')).toBeInTheDocument();
    expect(screen.getByLabelText('Item')).toHaveValue('');
    // A medida não fica escolhida para o próximo item
    expect(screen.getByRole('button', { name: 'Por kg' })).toHaveAttribute('aria-pressed', 'false');
    expect(chamadas).toContainEqual(
      expect.objectContaining({
        metodo: 'POST',
        caminho: '/api/listas/100/itens',
        corpo: { nome: 'Bananas', categoriaId: 2, quantidadePlanejada: '1 dúzia', medida: 'KG' },
      }),
    );
  });

  it('exige a medida antes de adicionar', async () => {
    const { chamadas } = criarApiFalsa();
    const { usuario } = renderizarApp('/listas/100/planejar', { logado: true });

    await usuario.type(await screen.findByLabelText('Item'), 'Arroz');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escolha a medida: por unidade ou por kg.',
    );
    expect(chamadas.some((c) => c.caminho === '/api/listas/100/itens')).toBe(false);

    await usuario.click(screen.getByRole('button', { name: 'Por unidade' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('categorias', () => {
  it('aberta a partir de uma lista, o botão volta para a lista e a aba de origem', async () => {
    criarApiFalsa();
    renderizarApp('/familias/10/categorias?lista=100&aba=comprar', { logado: true });

    const voltar = await screen.findByRole('link', { name: 'Voltar para Mercado' });
    expect(voltar).toHaveAttribute('href', '/listas/100/comprar');
  });
});

describe('comprar', () => {
  it('marca um item pelo formulário e atualiza o total parcial', async () => {
    const { estado, chamadas } = criarApiFalsa();
    estado.itens.push(novoItem({ id: 1, nome: 'Leite', quantidadePlanejada: '2 un' }));
    const { usuario } = renderizarApp('/listas/100/comprar', { logado: true });

    // O checkbox só abre o formulário: o item fica marcado ao confirmar
    await usuario.click(await screen.findByRole('checkbox', { name: 'Pegar Leite' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Leite' });
    expect(within(dialogo).getByLabelText('Quantidade')).toHaveValue('2');
    await usuario.type(within(dialogo).getByLabelText('Preço da unidade (R$)'), '6,50');
    await usuario.type(within(dialogo).getByLabelText('Marca (opcional)'), 'Itambé');
    expect(within(dialogo).getByText(/13,00/)).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Marcar como pego' }));

    expect(await screen.findByRole('checkbox', { name: 'Desmarcar Leite' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    const total = screen.getByRole('region', { name: 'Total da compra' });
    expect(within(total).getByText(/13,00/)).toBeInTheDocument();
    expect(chamadas).toContainEqual(
      expect.objectContaining({
        metodo: 'PUT',
        caminho: '/api/itens/1/pego',
        corpo: { tipoPreco: 'UNIDADE', quantidadePega: 2, preco: 6.5, marca: 'Itambé', versao: 0 },
      }),
    );
  });

  it('por kg, informa o peso e o preço total pago por ele', async () => {
    const { estado, chamadas } = criarApiFalsa();
    estado.itens.push(
      novoItem({
        id: 1,
        nome: 'Banana',
        quantidadePlanejada: '1 kg',
        medida: 'KG',
        tipoPreco: 'KG',
      }),
    );
    const { usuario } = renderizarApp('/listas/100/comprar', { logado: true });

    await usuario.click(await screen.findByRole('checkbox', { name: 'Pegar Banana' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Banana' });
    // Item planejado por kg já abre em "Por kg", com o peso planejado sugerido
    expect(within(dialogo).getByRole('button', { name: 'Por kg' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await usuario.clear(within(dialogo).getByLabelText('Peso (kg)'));
    await usuario.type(within(dialogo).getByLabelText('Peso (kg)'), '1,25');
    await usuario.type(within(dialogo).getByLabelText('Preço total (R$)'), '8,63');
    expect(within(dialogo).getByText(/8,63/, { selector: 'strong' })).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Marcar como pego' }));

    const total = await screen.findByRole('region', { name: 'Total da compra' });
    await waitFor(() => expect(within(total).getByText(/8,63/)).toBeInTheDocument());
    expect(chamadas).toContainEqual(
      expect.objectContaining({
        metodo: 'PUT',
        corpo: { tipoPreco: 'KG', quantidadePega: 1.25, preco: 8.63, versao: 0 },
      }),
    );
  });

  it('desmarcar todos pede confirmação e zera a compra', async () => {
    const { estado, chamadas } = criarApiFalsa();
    estado.itens.push(
      novoItem({ id: 1, nome: 'Pão', pego: true, pegoEm: new Date().toISOString(), preco: 7 }),
    );
    const { usuario } = renderizarApp('/listas/100/comprar', { logado: true });

    await usuario.click(await screen.findByRole('button', { name: 'Desmarcar todos' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Desmarcar todos os itens?' });
    expect(dialogo).toHaveTextContent(/preços e marcas informados nesta compra serão apagados/);
    await usuario.click(within(dialogo).getByRole('button', { name: 'Desmarcar todos' }));

    expect(await screen.findByRole('checkbox', { name: 'Pegar Pão' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(chamadas).toContainEqual(
      expect.objectContaining({ metodo: 'POST', caminho: '/api/listas/100/desmarcar-todos' }),
    );
  });

  it('desfaz o desmarcar se a API falhar', async () => {
    const { estado } = criarApiFalsa();
    estado.itens.push(
      novoItem({ id: 1, nome: 'Pão', pego: true, pegoEm: new Date().toISOString() }),
    );
    estado.falharDesmarcar = true;
    const { usuario } = renderizarApp('/listas/100/comprar', { logado: true });

    await usuario.click(await screen.findByRole('checkbox', { name: 'Desmarcar Pão' }));

    expect(await screen.findByText(/Não foi possível desmarcar o item/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Desmarcar Pão' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('finaliza só com o valor final, que já vem com a soma dos itens', async () => {
    const { estado, chamadas } = criarApiFalsa();
    const pegoEm = new Date().toISOString();
    estado.itens.push(
      novoItem({ id: 1, nome: 'Pão', pego: true, pegoEm, preco: 7.88, quantidadePega: 4 }),
    );
    const { usuario } = renderizarApp('/listas/100/finalizar', { logado: true });

    // Sem mercado: é opcional, e a data já vem como hoje
    expect(await screen.findByLabelText('Valor final pago (R$)')).toHaveValue('31,52');
    await usuario.click(screen.getByRole('button', { name: 'Concluir compra' }));

    expect(await screen.findByText('Compra concluída')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mercado' })).toBeInTheDocument();
    const corpo = chamadas.find((c) => c.caminho === '/api/listas/100/compras')?.corpo;
    expect(corpo).toMatchObject({ valorTotal: 31.52, extrasMantidos: [] });
    expect(corpo).not.toHaveProperty('mercado');
  });

  it('aceita valor final menor que a soma dos itens, como desconto', async () => {
    const { estado, chamadas } = criarApiFalsa();
    estado.itens.push(
      novoItem({ id: 1, nome: 'Pão', pego: true, pegoEm: new Date().toISOString(), preco: 7.88 }),
    );
    const { usuario } = renderizarApp('/listas/100/finalizar', { logado: true });

    const campo = await screen.findByLabelText('Valor final pago (R$)');
    await usuario.clear(campo);
    await usuario.type(campo, '5,00');
    const resumo = screen.getByRole('heading', { name: 'Resumo' }).closest('div')!;
    expect(within(resumo).getByText('Desconto')).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Mercado (opcional)'), 'Atacadão');
    await usuario.click(screen.getByRole('button', { name: 'Concluir compra' }));

    expect(await screen.findByText('Compra concluída')).toBeInTheDocument();
    expect(chamadas).toContainEqual(
      expect.objectContaining({
        caminho: '/api/listas/100/compras',
        corpo: expect.objectContaining({ valorTotal: 5, mercado: 'Atacadão' }),
      }),
    );
  });

  it('itens sem preço entram corrigindo o valor final', async () => {
    const { estado, chamadas } = criarApiFalsa();
    const pegoEm = new Date().toISOString();
    estado.itens.push(
      novoItem({ id: 1, nome: 'Pão', pego: true, pegoEm, preco: 7.88, quantidadePega: 4 }),
      novoItem({ id: 2, nome: 'Frutas', categoriaId: 2, pego: true, pegoEm }),
    );
    const { usuario } = renderizarApp('/listas/100/finalizar', { logado: true });

    expect(await screen.findByRole('heading', { name: 'Itens sem preço' })).toBeInTheDocument();
    const campo = screen.getByLabelText('Valor final pago (R$)');
    await usuario.clear(campo);
    await usuario.type(campo, '50,00');
    await usuario.click(screen.getByRole('button', { name: 'Concluir compra' }));

    expect(await screen.findByText('Compra concluída')).toBeInTheDocument();
    expect(chamadas).toContainEqual(
      expect.objectContaining({
        caminho: '/api/listas/100/compras',
        corpo: expect.objectContaining({ valorTotal: 50 }),
      }),
    );
  });

  it('não finaliza sem o valor final', async () => {
    const { estado, chamadas } = criarApiFalsa();
    estado.itens.push(
      novoItem({ id: 1, nome: 'Pão', pego: true, pegoEm: new Date().toISOString(), preco: 7.88 }),
    );
    const { usuario } = renderizarApp('/listas/100/finalizar', { logado: true });

    await usuario.clear(await screen.findByLabelText('Valor final pago (R$)'));
    await usuario.click(screen.getByRole('button', { name: 'Concluir compra' }));

    expect(screen.getByText(/Informe o valor final pago/)).toBeInTheDocument();
    expect(chamadas.some((c) => c.caminho === '/api/listas/100/compras')).toBe(false);
  });
});

describe('compra em dois aparelhos', () => {
  const daBia = () => ({
    pego: true,
    pegoEm: new Date().toISOString(),
    pegoPor: { id: 2, nome: 'Bia' },
  });

  it('o que outra pessoa marca aparece sozinho na tela, com o total igual', async () => {
    const { estado, alterarEmOutroAparelho } = criarApiFalsa();
    estado.itens.push(novoItem({ id: 1, nome: 'Leite' }));
    renderizarApp('/listas/100/comprar', { logado: true });
    expect(await screen.findByRole('checkbox', { name: 'Pegar Leite' })).toBeInTheDocument();

    alterarEmOutroAparelho(1, { ...daBia(), preco: 5, quantidadePega: 2 });

    // Sem recarregar a página: a sincronização periódica traz a alteração da Bia
    expect(
      await screen.findByRole('checkbox', { name: 'Desmarcar Leite' }, { timeout: 5000 }),
    ).toHaveAttribute('aria-checked', 'true');
    const total = screen.getByRole('region', { name: 'Total da compra' });
    expect(within(total).getByText(/10,00/)).toBeInTheDocument();
  }, 10_000);

  it('não sobrescreve o item que outra pessoa marcou enquanto o formulário estava aberto', async () => {
    const { estado, alterarEmOutroAparelho } = criarApiFalsa();
    estado.itens.push(novoItem({ id: 1, nome: 'Leite' }));
    const { usuario } = renderizarApp('/listas/100/comprar', { logado: true });

    await usuario.click(await screen.findByRole('checkbox', { name: 'Pegar Leite' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Leite' });
    alterarEmOutroAparelho(1, { ...daBia(), preco: 5 });
    await usuario.type(within(dialogo).getByLabelText('Preço da unidade (R$)'), '9');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Marcar como pego' }));

    // Recusado: o formulário fecha, avisa e a tela mostra o que a Bia marcou
    expect(await screen.findByRole('alert')).toHaveTextContent(/Outra pessoa alterou este item/);
    expect(screen.queryByRole('dialog', { name: 'Leite' })).not.toBeInTheDocument();
    const total = screen.getByRole('region', { name: 'Total da compra' });
    await waitFor(() => expect(within(total).getByText(/5,00/)).toBeInTheDocument());
    expect(estado.itens[0].preco).toBe(5);
  });

  it('não finaliza com valores que mudaram depois de conferidos', async () => {
    const { estado, alterarEmOutroAparelho, chamadas } = criarApiFalsa();
    estado.itens.push(novoItem({ id: 1, nome: 'Pão', ...daBia(), preco: 7.88 }));
    const { usuario } = renderizarApp('/listas/100/finalizar', { logado: true });

    expect(await screen.findByLabelText('Valor final pago (R$)')).toHaveValue('7,88');
    alterarEmOutroAparelho(1, { preco: 10 });
    await usuario.click(screen.getByRole('button', { name: 'Concluir compra' }));

    // A compra não foi concluída: a tela mostra o valor novo para conferir de novo
    expect(await screen.findByText(/Outra pessoa alterou a lista/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByLabelText('Valor final pago (R$)')).toHaveValue('10,00'),
    );
    expect(estado.compras).toHaveLength(0);

    await usuario.click(screen.getByRole('button', { name: 'Concluir compra' }));
    expect(await screen.findByText('Compra concluída')).toBeInTheDocument();
    expect(estado.compras[0].valorTotal).toBe(10);
    expect(chamadas.filter((c) => c.caminho === '/api/listas/100/compras')).toHaveLength(2);
  });
});

describe('tema', () => {
  it('começa escuro, alterna para claro e lembra a escolha', async () => {
    criarApiFalsa();
    const { usuario } = renderizarApp('/');

    expect(document.documentElement.dataset.theme).toBeUndefined();
    await usuario.click(screen.getByRole('button', { name: 'Usar tema claro' }));

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('familyctrl.tema')).toBe('claro');
    await usuario.click(screen.getByRole('button', { name: 'Usar tema escuro' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem('familyctrl.tema')).toBeNull();
  });
});
