-- A quantidade planejada deixa de ser texto livre ("2 kg", "1 pacote") e vira número, na medida
-- do item: unidades (por unidade) ou kg (por kg). Assim a tela oferece botões + e − e o
-- formulário de pegar já vem com a quantidade certa.
--
-- Conversão dos textos que já existem: vale o primeiro número do texto ("2 pacotes" → 2,
-- "1,5 kg" → 1,5). Em gramas num item por kg, divide por 1000 ("500 g" → 0,5). Peso num item por
-- unidade não tem como virar unidades: fica sem quantidade, assim como textos sem número.
-- O histórico (compra_itens) continua com o texto: é só registro.

alter table itens add column quantidade_planejada_nova numeric(10, 3);

with convertidos as (
    select id,
           medida,
           replace(substring(quantidade_planejada from '[0-9]+(?:[.,][0-9]+)?'), ',', '.')::numeric as numero,
           quantidade_planejada ~* '[0-9]\s*(kg|quilos?)\M' as em_kg,
           quantidade_planejada ~* '[0-9]\s*(g|gr|gramas?)\M' as em_gramas
    from itens
    where quantidade_planejada is not null
)
update itens i
set quantidade_planejada_nova = case
        when c.numero is null or c.numero <= 0 or c.numero >= 1000000 then null
        when c.medida = 'UNIDADE' and (c.em_kg or c.em_gramas) then null
        when c.em_gramas then round(c.numero / 1000, 3)
        else round(c.numero, 3)
    end
from convertidos c
where c.id = i.id;

alter table itens drop column quantidade_planejada;
alter table itens rename column quantidade_planejada_nova to quantidade_planejada;
