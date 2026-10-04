-- Compras simultâneas em vários aparelhos: cada item e cada lista ganham um número de versão.
-- itens.versao: sobe a cada alteração do item (controle otimista do JPA, @Version). Quem altera
--   informa a versão que está vendo; se outra pessoa mudou o item antes, a resposta é 409.
-- listas.versao: sobe a cada alteração em qualquer item da lista. Finalizar a compra e
--   "desmarcar todos" exigem a versão atual, para nunca agir sobre valores que a tela não mostrou.
alter table itens add column versao bigint not null default 0;

alter table listas add column versao bigint not null default 0;
