# 06 — Mitigação: Defesa em camadas (defense in depth)

Prepared statement (doc 05) é a correção principal e **suficiente** para impedir
a injeção. Então por que falar de mais camadas? Porque segurança de verdade não
aposta tudo numa única barreira. Se um dia alguém esquecer um `?` num canto do
código, as camadas de baixo **reduzem o estrago**.

> 🧅 Pense numa cebola (ou num castelo com vários muros): o atacante teria de
> furar **todas** as camadas. Cada uma sozinha ajuda; juntas, protegem muito.

Este laboratório implementa **quatro** camadas na app segura. Vamos por elas.

---

## Camada 1 — Prepared statements (a base)

Já detalhada no doc 05. É o que **impede** a injeção acontecer.
Tudo abaixo é rede de segurança para o caso de essa camada falhar por descuido.

```js
// ✅ SEGURO
const [rows] = await pool.execute(
  'SELECT id, username, papel FROM usuarios WHERE username = ? AND senha_hash = ?',
  [username, senhaHash]
);
```

---

## Camada 2 — Validação de entrada / allowlist

**Allowlist** = dizer o que é **permitido** (e recusar todo o resto), em vez de
tentar listar o que é proibido (blocklist, sempre incompleta).

Na app segura, o nome de usuário só passa se casar com um formato conhecido:

```js
// ✅ SEGURO (app_seguro/server.js)
const USERNAME_PERMITIDO = /^[A-Za-z0-9._@-]{1,50}$/;

if (!USERNAME_PERMITIDO.test(username)) {
  return res.render('login', { titulo: 'Login', erro: 'Usuário ou senha inválidos.' });
}
```

E a busca limita o tamanho do termo:

```js
// ✅ SEGURO
const termo = String(req.query.q || '').slice(0, 100);
```

**Importante:** validação de entrada **não substitui** o prepared statement.
Ela é uma camada **a mais**:
- rejeita cedo entradas absurdas (menos superfície de ataque, logs mais limpos);
- protege campos onde `?` não se aplica (nomes de coluna → ver allowlist no doc 05);
- mas, sozinha, é frágil: dá para escrever payloads que passam por muitos filtros.
  Por isso ela **acompanha**, e não **substitui**, a parametrização.

---

## Camada 3 — Tratamento de erro genérico (não vaze detalhes)

A app **vulnerável** joga o erro cru do MySQL na tela:

```js
// ⚠️ VULNERÁVEL
erro: 'Erro no MySQL: ' + (err.sqlMessage || err.message)
```

Isso entrega ao atacante nomes de colunas, número de colunas, estrutura da
query... (o "error-based" do doc 02). A app **segura** faz o oposto:

```js
// ✅ SEGURO (app_seguro/server.js)
console.error('[app_seguro] Erro no login:', err.message); // detalhe só no LOG do servidor
return res.render('login', {
  titulo: 'Login',
  erro: 'Não foi possível processar o login agora. Tente novamente.', // neutro na tela
});
```

Regra: **o desenvolvedor** precisa do detalhe (vai para o log); **o usuário**
(e o atacante) recebe uma mensagem neutra. Além disso, a app segura **nunca**
mostra a SQL executada na tela (o `sqlExecutada` fica sempre `null`).

---

## Camada 4 — Menor privilégio no banco

Mesmo que todas as camadas acima falhassem, ainda há uma última linha: **o que
o usuário do banco tem permissão de fazer.**

- App **vulnerável**: conecta como **`root`** (poder total). Uma stacked query
  como `'; DROP TABLE usuarios; -- ` conseguiria apagar tabelas.
- App **segura**: conecta como **`app_seguro`**, criado em
  `db/least_privilege.sql` com **apenas `SELECT`** nas duas tabelas:

```sql
-- db/least_privilege.sql
CREATE USER 'app_seguro'@'%' IDENTIFIED BY 'senha_app_seguro';
GRANT SELECT ON sqli_lab.usuarios TO 'app_seguro'@'%';
GRANT SELECT ON sqli_lab.produtos TO 'app_seguro'@'%';
```

Assim, mesmo num cenário catastrófico, o pior que aconteceria seria **leitura** —
nunca `UPDATE`, `DELETE`, `DROP`, criação de usuários ou acesso a outros bancos.

> 🧪 Demonstre ao vivo: conecte no MySQL como `app_seguro` e tente
> `DELETE FROM produtos;` → o banco responde **"command denied"**. É a camada
> segurando o golpe.

---

## Camada 5 (bônus de configuração) — `multipleStatements: false`

No pool da app vulnerável está `multipleStatements: true`, que permite mandar
vários comandos separados por `;` numa só chamada (stacked queries). A app segura
mantém **`false`** (o padrão):

```js
// ✅ SEGURO (app_seguro/db.js)
multipleStatements: false, // corta stacked queries como '; DROP TABLE ...; --
```

Sozinha, essa opção não impede UNION nem bypass — mas fecha a porta das stacked
queries, que são as mais destrutivas.

---

## Quadro-resumo das camadas

| Camada | O que faz | Onde está no projeto |
|--------|-----------|----------------------|
| 1. Prepared statements | **Impede** a injeção (dado ≠ código) | `app_seguro/server.js` (`pool.execute` + `?`) |
| 2. Validação / allowlist | Rejeita entradas fora do formato | `USERNAME_PERMITIDO`, `slice(0,100)` |
| 3. Erro genérico | Não vaza estrutura do banco | `console.error` + mensagem neutra |
| 4. Menor privilégio | Limita o estrago no pior caso | `db/least_privilege.sql` (só `SELECT`) |
| 5. `multipleStatements: false` | Corta stacked queries | `app_seguro/db.js` |

Nenhuma camada isolada é a "bala de prata" (a camada 1 é a que resolve a
injeção). Mas, **empilhadas**, elas transformam um erro pontual num
não-evento em vez de num vazamento.

➡️ Próximo: [`07-roteiro-da-apresentacao.md`](07-roteiro-da-apresentacao.md) —
o roteiro cronometrado para apresentar tudo isso em ~18 minutos.
