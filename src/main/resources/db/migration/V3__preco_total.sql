-- "Preço por kg" vira "preço total": no dia a dia é mais fácil digitar o valor da etiqueta da
-- balança do que o preço do quilo. Registros por kg são convertidos para o total equivalente.

alter table itens drop constraint ck_itens_tipo_preco;

-- Com preço e peso: total = preço do kg × peso (o mesmo subtotal de antes)
update itens
set preco = round(preco * quantidade_pega, 2), tipo_preco = 'TOTAL'
where tipo_preco = 'KG' and preco is not null and quantidade_pega is not null;

-- Por kg sem peso não tinha subtotal: o preço do kg não serve como total, vira "sem preço"
update itens set preco = null, tipo_preco = 'TOTAL' where tipo_preco = 'KG';

alter table itens add constraint ck_itens_tipo_preco check (tipo_preco in ('UNIDADE', 'TOTAL'));

-- Compras concluídas: o subtotal gravado já é o total; o preço passa a ser esse total
update compra_itens set preco = subtotal, tipo_preco = 'TOTAL' where tipo_preco = 'KG';
