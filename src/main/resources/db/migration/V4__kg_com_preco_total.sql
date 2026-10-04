-- O tipo volta a se chamar "KG", agora com o significado de "peso em kg + preço total pago"
-- (ex.: 1 kg por R$ 50,00). Os registros "TOTAL" da V3 já guardam exatamente isso.

alter table itens drop constraint ck_itens_tipo_preco;

update itens set tipo_preco = 'KG' where tipo_preco = 'TOTAL';

alter table itens add constraint ck_itens_tipo_preco check (tipo_preco in ('UNIDADE', 'KG'));

update compra_itens set tipo_preco = 'KG' where tipo_preco = 'TOTAL';
