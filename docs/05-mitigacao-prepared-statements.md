# 05 — Mitigação: Prepared Statements (a correção de raiz)

Os docs 03 e 04 mostraram o problema. Agora, a **solução principal** — e por que
ela ataca a **causa**, não o sintoma.

---

## A causa: dado misturado com código

Toda a SQLi vem de uma única confusão: o texto do usuário virou parte do comando.
Muita gente tenta consertar do jeito errado, atacando o **sintoma**:

- ❌ "Vou proibir a aspa `'`." → quebra nomes legítimos (O'Brien) e o atacante
  acha outros caminhos.
- ❌ "Vou filtrar a palavra `UNION`." → dá para ofuscar (`UNiON`, comentários no
  meio) e você vira um jogo de gato e rato que **você perde**.
- ❌ "Vou escapar as aspas na mão." → fácil esquecer um caso; é frágil.

O jeito certo ataca a **causa**: **nunca deixar o dado virar código.** É isso que
o prepared statement faz — por construção, não por filtragem.

---

## O que é um prepared statement

É um contrato em duas etapas com o banco:

1. **"Prepare este comando, com buracos marcados por `?`":**

   ```sql
   SELECT id, username, papel FROM usuarios WHERE username = ? AND senha_hash = ?
   ```

   Nesse momento o MySQL **analisa e fixa a estrutura** da query. Ele já sabe:
   "vai ter dois valores, um em cada `?`". A forma do comando está **congelada**.

2. **"Agora execute, com estes valores":** `['admin\' -- ', '<hash>']`

   Os valores viajam **separados** da instrução. Eles preenchem os `?` como
   **dados puros**. Não importa o que tenha dentro — aspas, `UNION`, `;`, `-- ` —
   nada disso é re-analisado como SQL, porque a estrutura **já foi decidida** na
   etapa 1.

> 🔒 Analogia: é como um formulário impresso com campos fixos. Você entrega os
> valores para o funcionário digitar **nos campos certos**. Ele não vai
> "reprogramar o formulário" com o que você escreveu — só preenche o espaço.
> No jeito concatenado, ao contrário, você escrevia direto no *modelo* do
> formulário, podendo mudar as próprias perguntas.

---

## Lado a lado: vulnerável × seguro

### Login

```js
// ⚠️ VULNERÁVEL (app_vulneravel/server.js)
const sql =
  `SELECT id, username, papel FROM usuarios ` +
  `WHERE username = '${username}' AND senha_hash = '${senhaHash}'`;
const [rows] = await pool.query(sql);          // interpola texto e manda tudo junto
```

```js
// ✅ SEGURO (app_seguro/server.js)
const sql = 'SELECT id, username, papel FROM usuarios WHERE username = ? AND senha_hash = ?';
const [rows] = await pool.execute(sql, [username, senhaHash]);   // dados separados
```

### Busca

```js
// ⚠️ VULNERÁVEL
const sql = `SELECT id, nome, descricao, preco FROM produtos WHERE nome LIKE '%${termo}%'`;
const [rows] = await pool.query(sql);
```

```js
// ✅ SEGURO — o padrão '%...%' é montado em JS e vai como VALOR
const sql = 'SELECT id, nome, descricao, preco FROM produtos WHERE nome LIKE ?';
const [rows] = await pool.execute(sql, [`%${termo}%`]);
```

Repare: no seguro, o `%` faz parte do **valor** passado no array, não da string
SQL. O usuário nunca toca no texto do comando.

---

## `query()` × `execute()` no mysql2 (a diferença que importa)

O driver `mysql2` tem os dois métodos, e a diferença é central para esta aula:

| | `pool.query(sql, [valores])` | `pool.execute(sql, [valores])` |
|---|---|---|
| Como trata os valores | Faz **escaping** e **interpola** os valores na string, no lado do cliente, e manda uma string pronta | Usa o **protocolo de prepared statement** do MySQL: manda o comando e os valores **separados** |
| Placeholder | aceita `?`, mas... | usa `?` de verdade como parâmetro |
| Prepared no servidor | Não (é uma query textual) | **Sim** (o servidor prepara e pode reusar o plano) |
| Recomendado contra SQLi | Só se você **sempre** usar `?` e **nunca** concatenar | ✅ Sim — deixa a separação dado/código explícita |

⚠️ **Cuidado:** `pool.query()` **com `?`** também é seguro, porque o mysql2 faz
o escaping dos valores. O que torna a app vulnerável **não é** o `query()` em si
— é a **concatenação** (`'${...}'`). O `query()` só vira armadilha quando você
gruda o input na string em vez de usar `?`.

Neste laboratório adotamos `execute()` na app segura porque ele deixa a intenção
mais clara ("isto é um prepared statement, estes são os parâmetros") e ainda
ganha cache de plano no servidor. A regra prática para levar pra vida:

> **Sempre `?` para valores. Nunca `${input}` dentro do SQL.**

---

## E quando o "buraco" não é um valor?

Placeholders `?` só valem para **valores** (o que vai entre aspas). Eles **não**
funcionam para **nomes de tabela/coluna** nem para palavras-chave. Isto é
inválido:

```js
// ❌ NÃO funciona: '?' não pode ser nome de coluna
await pool.execute('SELECT * FROM produtos ORDER BY ?', [coluna]);
```

Se você precisa deixar o usuário escolher a coluna de ordenação, use uma
**allowlist** (lista fechada de valores permitidos):

```js
// ✅ Allowlist: só um conjunto fixo e conhecido de colunas é aceito
const COLUNAS_OK = { nome: 'nome', preco: 'preco', id: 'id' };
const coluna = COLUNAS_OK[req.query.ordenar] || 'nome'; // fallback seguro
const sql = `SELECT id, nome, descricao, preco FROM produtos ORDER BY ${coluna}`;
// aqui 'coluna' NÃO veio do usuário direto: veio de uma lista que VOCÊ controla
await pool.query(sql);
```

A app segura usa essa mesma ideia de allowlist para **validar o formato do
username** (`^[A-Za-z0-9._@-]+$`) antes de consultar. Isso é assunto do próximo
doc: defesa em camadas.

---

## Resumo

- Prepared statement resolve **na raiz** porque separa **dado** de **código** —
  a fronteira não pode mais ser rompida por uma aspa.
- No mysql2: prefira `execute(sql, [params])` com `?`; **nunca** concatene input.
- `?` é só para **valores**. Para identificadores, use **allowlist**.
- Filtrar aspas/palavras é remendo; parametrizar é conserto.

➡️ Próximo: [`06-mitigacao-defesa-em-camadas.md`](06-mitigacao-defesa-em-camadas.md)
— as outras camadas que reforçam a proteção.
