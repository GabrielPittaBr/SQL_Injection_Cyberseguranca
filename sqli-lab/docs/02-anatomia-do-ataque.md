# 02 — Anatomia do ataque

Neste documento a gente "abre o capô" e olha, passo a passo, como uma query
é montada e **onde exatamente** a injeção entra.

---

## 1. O ciclo normal de uma requisição

Quando você clica em "Entrar" ou "Buscar", acontece isto:

```
[Navegador] --(username, senha ou termo de busca)--> [Servidor Node/Express]
     ^                                                        |
     |                                            monta uma query SQL
     |                                                        v
[Tela HTML] <--(resultado formatado)-- [Servidor] <--(linhas)-- [MySQL]
```

O ponto crítico é a etapa **"monta uma query SQL"**. É ali que o código decide
se o texto do usuário será tratado como **dado** ou vai se misturar ao **código**.

---

## 2. Como o MySQL enxerga uma query

Antes de executar, o banco **analisa a sintaxe** (parsing) da string SQL:
ele separa palavras-chave (`SELECT`, `WHERE`, `UNION`...), identificadores
(nomes de tabelas/colunas), operadores (`=`, `OR`) e **literais** (valores entre
aspas, como `'admin'`).

O detalhe que o atacante explora: para o MySQL, **uma aspa simples `'` marca o
início e o fim de um texto**. Se o atacante conseguir "colar" uma aspa dentro do
valor, ele **fecha o texto mais cedo** e o que vier depois volta a ser
interpretado como **código**.

---

## 3. A fronteira que se rompe (com um diagrama mental)

Pense na query como duas faixas:

```
CÓDIGO  ....  ' <-- aqui começa o território do DADO -->  '  .... CÓDIGO
```

Na versão vulnerável, o valor do usuário é jogado *dentro* dessas aspas **por
concatenação de texto**. Se o valor contém uma aspa, ele **rasga a faixa**:

Entrada do usuário no campo *username*:  `admin' -- `

```
WHERE username = 'admin' --  ' AND senha_hash = '...'
                 └──dado──┘└──────virou código!──────┘
```

A aspa fechou o literal cedo; `-- ` comentou o resto. **A fronteira caiu.**

---

## 4. Onde estão as duas falhas deste laboratório

### Falha #1 — Login (concatenação)

`app_vulneravel/server.js`:

```js
// ⚠️ VULNERÁVEL — repare que a query fica numa ÚNICA linha (ver nota abaixo)
const sql =
  `SELECT id, username, papel FROM usuarios ` +
  `WHERE username = '${username}' AND senha_hash = '${senhaHash}'`;
const [rows] = await pool.query(sql);
```

> 🧩 **Por que uma linha só?** O comentário `-- ` do MySQL vale **até o fim da
> linha**. Se o `AND senha_hash = ...` estivesse numa linha separada, o `-- `
> injetado comentaria apenas o resto da primeira linha e a checagem de senha
> **continuaria valendo** — o bypass falharia. Manter tudo numa linha faz o
> comentário apagar a condição inteira. É um detalhe que derruba muita gente na
> primeira tentativa.

O `${username}` é substituído por **texto puro** antes de o MySQL ver a query.
Quem controla `username` controla parte da instrução. → Explorada no doc 03.

### Falha #2 — Busca (concatenação + UNION)

```js
// ⚠️ VULNERÁVEL
const sql = `
  SELECT id, nome, descricao, preco
  FROM produtos
  WHERE nome LIKE '%${termo}%'
`;
const [rows] = await pool.query(sql);
```

Aqui há **4 colunas** no `SELECT`. Isso é ouro para um `UNION`, que exige o
mesmo número de colunas dos dois lados. → Explorada no doc 04.

---

## 5. As três "peças" que o atacante combina

Quase todo payload de SQLi usa alguma mistura destas três peças:

1. **Uma aspa `'`** para escapar do território do dado.
2. **Uma lógica ou comando** para fazer o que ele quer:
   - `OR '1'='1'` → tornar o `WHERE` sempre verdadeiro (bypass);
   - `UNION SELECT ...` → colar dados de outra tabela (extração);
   - `; UPDATE ...` → emendar outro comando (stacked, se permitido).
3. **Um comentário** (`-- ` ou `#`) para **descartar o resto** da query original
   e não quebrar a sintaxe.

Guarde esse "molde": aspa → payload → comentário. Ele explica praticamente todos
os exemplos do `payloads.md`.

---

## 6. Comentários no MySQL (detalhe que derruba iniciante)

| Forma  | Observação |
|--------|------------|
| `-- `  | **Exige um espaço** após os dois traços. `--admin` NÃO comenta; `-- admin` comenta. |
| `#`    | Comenta o resto da linha, sem exigir espaço. |
| `/* */`| Comentário de bloco. |

Nos formulários web, o espaço depois de `-- ` às vezes é difícil de ver.
Na dúvida, use `#`. Isso está explicado também no `payloads.md`.

---

## 7. Por que o "error-based" ajuda o atacante

A app vulnerável mostra o **erro cru** do MySQL na tela (`err.sqlMessage`).
Isso parece inofensivo, mas é um mapa para o atacante:

- `Unknown column '5' in 'order clause'` → revela quantas colunas a query tem.
- `Table 'sqli_lab.usuarios' doesn't exist` → confirma nomes de tabelas.
- Erros de sintaxe → mostram como a query foi montada.

Por isso a app segura **nunca** mostra esse detalhe ao usuário: ela registra no
log do servidor e devolve uma mensagem neutra. (Ver doc 06.)

---

➡️ Próximo: [`03-demo-login-bypass.md`](03-demo-login-bypass.md) — mão na massa:
vamos entrar como admin sem senha.
