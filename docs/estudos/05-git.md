# Git e GitHub Flow

## Conventional Commits

Mensagem no formato `tipo: descrição curta no imperativo/presente`:

| Tipo       | Quando usar                                |
| ---------- | ------------------------------------------ |
| `feat`     | nova funcionalidade                        |
| `fix`      | correção de bug                            |
| `docs`     | só documentação                            |
| `test`     | só testes                                  |
| `refactor` | mudança de código sem mudar comportamento  |
| `chore`    | configuração, dependências, manutenção     |
| `ci`       | pipelines de CI/CD                         |

Exemplos deste repositório: `feat: famílias, membros e convites`, `ci: workflows de backend...`.

## GitHub Flow

1. `main` sempre funcionando e protegida (não aceita push direto quando a proteção está ativa).
2. Para cada mudança, uma branch curta: `git switch -c feat/editar-perfil`.
3. Commits pequenos, push da branch, abre um Pull Request.
4. O CI roda; depois da revisão, faz merge na `main`.
5. O merge na `main` dispara o deploy.

## Comandos do dia a dia

```bash
git status                     # o que mudou
git diff                       # ver as mudanças
git add <arquivo>              # preparar para o commit
git commit -m "feat: ..."      # registrar
git log --oneline              # histórico resumido
git switch -c minha-branch     # criar e trocar de branch
git push -u origin minha-branch
git pull                       # trazer mudanças do remoto
```

## Fim de linha no Windows (LF x CRLF)

O `.gitattributes` com `* text=auto` faz o Git guardar tudo com LF no repositório e converter para
o padrão do sistema na sua máquina. O `mvnw` é forçado a LF (senão quebra no Linux do CI e do
Heroku) e os `.cmd` a CRLF. Os avisos "LF will be replaced by CRLF" são só informativos.
