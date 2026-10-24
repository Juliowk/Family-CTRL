-- Finalizar a compra só exige o valor final pago (o do cupom). O mercado passa a ser opcional.
alter table compras alter column mercado drop not null;

-- compras.valor_variavel passa a ser a diferença entre o valor pago e a soma dos itens com preço
-- (valor_total = valor_itens + valor_variavel). Negativo: desconto no caixa. Positivo: itens sem
-- preço ou acréscimo. As compras antigas não mudam: nelas o valor nunca é negativo.
comment on column compras.valor_variavel is
    'Valor pago menos a soma dos itens com preço. Negativo: desconto. Positivo: itens sem preço ou acréscimo.';
