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

describe('listas', () => {
  it('cria uma lista e abre o planejamento dela', async () => {
    const { chamadas } = criarApiFalsa();
    const { usuario } = renderizarApp('/familias/10', { logado: true });

    expect(await screen.findByRole('heading', { name: 'Casa da Ana' })).toBeInTheDocument();
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
    const { usuario } = renderizarApp('/familias/10', { logado: true });

    await usuario.click(await screen.findByRole('tab', { name: 'Importar CSV' }));
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
            { nome: 'Pão', categoriaId: 1, quantidadePlanejada: '6 un' },
            { nome: 'Cerveja', categoriaId: 3 },
          ],
        },
      }),
    );
  });

  it('mostra estado vazio quando a família não tem listas', async () => {
    const { estado } = criarApiFalsa();
    estado.listas = [];
    renderizarApp('/familias/10', { logado: true });

    expect(await screen.findByText('Nenhuma lista ainda')).toBeInTheDocument();
  });
});

describe('planejar', () => {
  it('adiciona item com categoria e quantidade, agrupado pela categoria', async () => {
    const { chamadas } = criarApiFalsa();
    const { usuario } = renderizarApp('/listas/100', { logado: true });

    // Sem aba na URL, a lista abre no planejamento
    await usuario.type(await screen.findByLabelText('Item'), 'Bananas');
    await usuario.click(screen.getByRole('radio', { name: 'Hortifrúti e Congelados' }));
    await usuario.type(screen.getByLabelText('Quantidade (opcional)'), '1 dúzia');
    await usuario.click(screen.getByRole('button', { name: 'Adicionar' }));

    const grupo = await screen.findByRole('region', { name: /Hortifrúti e Congelados/ });
    expect(within(grupo).getByText('Bananas')).toBeInTheDocument();
    expect(within(grupo).getByText('1 dúzia')).toBeInTheDocument();
    expect(screen.getByLabelText('Item')).toHaveValue('');
    expect(chamadas).toContainEqual(
      expect.objectContaining({
        metodo: 'POST',
        caminho: '/api/listas/100/itens',
        corpo: { nome: 'Bananas', categoriaId: 2, quantidadePlanejada: '1 dúzia' },
      }),
    );
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
        corpo: { tipoPreco: 'UNIDADE', quantidadePega: 2, preco: 6.5, marca: 'Itambé' },
      }),
    );
  });

  it('por kg, informa o peso e o preço total pago por ele', async () => {
    const { estado, chamadas } = criarApiFalsa();
    estado.itens.push(novoItem({ id: 1, nome: 'Banana', quantidadePlanejada: '1 kg' }));
    const { usuario } = renderizarApp('/listas/100/comprar', { logado: true });

    await usuario.click(await screen.findByRole('checkbox', { name: 'Pegar Banana' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Banana' });
    // Item pesado ("1 kg") já abre em "Por kg", com o peso sugerido
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
        corpo: { tipoPreco: 'KG', quantidadePega: 1.25, preco: 8.63 },
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

  it('finaliza informando o valor dos itens sem preço, o mercado e a data', async () => {
    const { estado, chamadas } = criarApiFalsa();
    const pegoEm = new Date().toISOString();
    estado.itens.push(
      novoItem({ id: 1, nome: 'Pão', pego: true, pegoEm, preco: 7.88, quantidadePega: 4 }),
      novoItem({ id: 2, nome: 'Frutas', categoriaId: 2, pego: true, pegoEm }),
    );
    const { usuario } = renderizarApp('/listas/100/finalizar', { logado: true });

    expect(
      await screen.findByRole('heading', { name: 'Itens com valor do caixa' }),
    ).toBeInTheDocument();
    // Sem o valor dos itens sem preço, o valor final ainda não é conhecido
    expect(screen.getByLabelText('Valor final pago (R$)')).toHaveValue('');
    await usuario.type(screen.getByLabelText('Valor dos itens sem preço (R$)'), '10,00');
    expect(screen.getByLabelText('Valor final pago (R$)')).toHaveValue('41,52');
    await usuario.type(screen.getByLabelText('Mercado'), 'Atacadão');
    await usuario.click(screen.getByRole('button', { name: 'Concluir compra' }));

    expect(await screen.findByText('Compra concluída')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mercado' })).toBeInTheDocument();
    expect(chamadas).toContainEqual(
      expect.objectContaining({
        metodo: 'POST',
        caminho: '/api/listas/100/compras',
        corpo: expect.objectContaining({
          mercado: 'Atacadão',
          valorVariavel: 10,
          extrasMantidos: [],
        }),
      }),
    );
  });

  it('o valor final do cupom calcula o valor dos itens sem preço', async () => {
    const { estado, chamadas } = criarApiFalsa();
    const pegoEm = new Date().toISOString();
    estado.itens.push(
      novoItem({ id: 1, nome: 'Pão', pego: true, pegoEm, preco: 7.88, quantidadePega: 4 }),
      novoItem({ id: 2, nome: 'Frutas', categoriaId: 2, pego: true, pegoEm }),
    );
    const { usuario } = renderizarApp('/listas/100/finalizar', { logado: true });

    await usuario.type(await screen.findByLabelText('Valor final pago (R$)'), '50,00');
    expect(screen.getByLabelText('Valor dos itens sem preço (R$)')).toHaveValue('18,48');
    await usuario.type(screen.getByLabelText('Mercado'), 'Atacadão');
    await usuario.click(screen.getByRole('button', { name: 'Concluir compra' }));

    expect(await screen.findByText('Compra concluída')).toBeInTheDocument();
    expect(chamadas).toContainEqual(
      expect.objectContaining({
        caminho: '/api/listas/100/compras',
        corpo: expect.objectContaining({ valorVariavel: 18.48 }),
      }),
    );
  });

  it('com todos os itens com preço, o valor final já vem preenchido e não aceita menos', async () => {
    const { estado } = criarApiFalsa();
    estado.itens.push(
      novoItem({ id: 1, nome: 'Pão', pego: true, pegoEm: new Date().toISOString(), preco: 7.88 }),
    );
    const { usuario } = renderizarApp('/listas/100/finalizar', { logado: true });

    const campo = await screen.findByLabelText('Valor final pago (R$)');
    expect(campo).toHaveValue('7,88');
    await usuario.clear(campo);
    await usuario.type(campo, '5,00');
    await usuario.type(screen.getByLabelText('Mercado'), 'Atacadão');
    await usuario.click(screen.getByRole('button', { name: 'Concluir compra' }));

    expect(screen.getByText(/não pode ser menor que o dos itens com preço/)).toBeInTheDocument();
  });
});

describe('tema', () => {
  it('começa claro, alterna para escuro e lembra a escolha', async () => {
    criarApiFalsa();
    const { usuario } = renderizarApp('/');

    expect(document.documentElement.dataset.theme).toBeUndefined();
    await usuario.click(screen.getByRole('button', { name: 'Usar tema escuro' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('familyctrl.tema')).toBe('escuro');
    await usuario.click(screen.getByRole('button', { name: 'Usar tema claro' }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
