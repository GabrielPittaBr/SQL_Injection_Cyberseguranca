# 01 — O que é SQL Injection?

## A ideia em uma frase

**SQL Injection (SQLi)** acontece quando aquilo que o usuário *digita* consegue
virar parte do *comando* que o banco de dados executa. Em vez de ser tratado
como um **dado** (um valor qualquer), o texto do usuário passa a ser interpretado
como **código SQL**.

> 🧠 Regra de ouro que vamos repetir a aula toda:
> **dado nunca deveria virar código.** Quando essa fronteira quebra, nasce a
> injeção.

---

## Uma analogia simples: o formulário e o assistente distraído

Imagine que você tem um assistente que executa pedidos escritos num papel.
Você criou um formulário com uma frase pronta, e ele preenche o espaço em branco
com o nome que a pessoa informou:

> "Traga o prontuário do paciente chamado **______**."

Um cliente honesto escreve `Maria`. O assistente lê:

> "Traga o prontuário do paciente chamado **Maria**." ✅

Agora chega um espertinho e escreve no campo do nome:

> `Maria. E, de passagem, traga também TODOS os prontuários e depois queime o arquivo.`

Se o assistente for **distraído** e apenas "ler tudo o que está no papel como se
fosse ordem sua", ele obedece a frase inteira. O problema não foi o pedido em si
— foi o assistente **misturar o texto do cliente com as suas ordens**.

No mundo dos sistemas:
- o **assistente distraído** é o código que **concatena** o texto do usuário
  dentro da instrução SQL;
- o **espertinho** é o atacante;
- o **papel com a ordem** é a query que vai para o banco.

A defesa (que veremos no doc 05) é o equivalente a dizer ao assistente:
> "Essa frase aqui é a *ordem*. E isto que o cliente escreveu é *apenas o valor
> do nome* — não importa o que esteja escrito, é só um nome."

Isso é exatamente o que um **prepared statement** faz.

---

## Como isso aparece em código (o pecado original)

Veja o trecho **vulnerável** deste laboratório (`app_vulneravel/server.js`),
onde o login monta a query grudando o input direto na string:

```js
// ⚠️ VULNERÁVEL: o input do usuário é concatenado direto na string SQL.
// (Montada em UMA linha de propósito: como "-- " comenta só até o fim da
//  linha, manter tudo numa linha só faz o comentário injetado apagar também
//  a checagem de senha.)
const sql =
  `SELECT id, username, papel FROM usuarios ` +
  `WHERE username = '${username}' AND senha_hash = '${senhaHash}'`;
const [rows] = await pool.query(sql);
```

Se o usuário digitar `admin' -- ` no campo *username*, a string final vira:

```sql
SELECT id, username, papel FROM usuarios WHERE username = 'admin' --  AND senha_hash = '....'
```

Tudo depois de `-- ` virou comentário. A checagem de senha **sumiu**, e o
atacante entra como `admin`. Isso é login bypass — a demo do doc 03.

E o jeito **seguro** (`app_seguro/server.js`), que trata o input como valor:

```js
// ✅ SEGURO: placeholders "?" — o input vai separado, como dado.
const sql = 'SELECT id, username, papel FROM usuarios WHERE username = ? AND senha_hash = ?';
const [rows] = await pool.execute(sql, [username, senhaHash]);
```

Aqui, digitar `admin' -- ` procura *literalmente* um usuário chamado
`admin' -- ` — que não existe. Nada de bypass.

---

## Por que SQLi é tão perigoso (e tão famoso)

- Está entre as vulnerabilidades mais antigas e ainda **mais comuns** da web
  (aparece de forma recorrente no **OWASP Top 10**, na categoria *Injection*).
- Com uma única falha, um atacante pode:
  - **burlar login** (entrar como qualquer usuário — doc 03);
  - **vazar dados** (ler tabelas inteiras, como senhas — doc 04);
  - **alterar ou destruir dados** (`UPDATE`, `DELETE`, `DROP` — ver bônus de
    stacked queries no `payloads.md`);
  - em casos graves, escalar para o sistema operacional.
- O estrago depende muito de **quais privilégios** o usuário do banco tem — por
  isso o **menor privilégio** importa tanto (doc 06).

---

## O que este laboratório tem

Duas aplicações **idênticas por fora**, diferentes por dentro:

| | App vulnerável (`:3000`) | App segura (`:3001`) |
|---|---|---|
| Monta a query | Concatenando input (`pool.query`) | Prepared statement (`pool.execute` + `?`) |
| Erros na tela | Mostra o erro cru do MySQL | Mensagem genérica; detalhe só no log |
| Usuário do banco | `root` (poder total) | `app_seguro` (só `SELECT`) |
| `multipleStatements` | `true` (permite stacked queries) | `false` |

Ao longo dos próximos documentos vamos **atacar** a app da esquerda e ver a app
da direita **resistir** aos mesmos payloads.

➡️ Próximo: [`02-anatomia-do-ataque.md`](02-anatomia-do-ataque.md) — como uma
query é montada e onde exatamente a fronteira "dado × código" se rompe.
