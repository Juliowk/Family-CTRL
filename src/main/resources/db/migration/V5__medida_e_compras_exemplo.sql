-- Medida do item planejado (por unidade ou por kg), escolhida ao planejar. Diferente de
-- tipo_preco, que é o estado da compra em andamento: ao pegar, o "preço por" começa nesta
-- medida, e ao desmarcar volta para ela.
alter table itens add column medida varchar(10) not null default 'UNIDADE';

update itens set medida = tipo_preco;

alter table itens add constraint ck_itens_medida check (medida in ('UNIDADE', 'KG'));

-- Compras da lista "Exemplo Visual": aparecem nas concluídas, mas não entram no resumo do mês
-- (gasto, quantidade e última compra), para não confundir quem acabou de chegar.
alter table compras add column exemplo boolean not null default false;

update compras set exemplo = true where lista_nome = 'Exemplo Visual';
