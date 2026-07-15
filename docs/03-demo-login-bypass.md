# 03 — Demo: Login Bypass (entrar sem senha)

> 🎯 **Objetivo:** entrar como `admin` na app vulnerável **sem saber a senha**,
> e depois mostrar que o **mesmo** payload falha na app segura.

Antes de começar, garanta que as duas apps estão no ar:
- Vulnerável: <http://localhost:3000>
- Segura: <http://localhost:3001>

(Se ainda não subiu, veja o `README.md`.)

---

## Parte A — Confirmando o login normal (linha de base)

Primeiro, mostre que o login funciona de verdade, para ninguém achar que é truque.

1. Abra <http://localhost:3000> (app vulnerável).
2. No campo **Usuário**, digite: `admin`
3. No campo **Senha**, digite: `admin123`
4. Clique **Entrar**.

**Resultado esperado:** caixa verde "✅ Autenticado como **admin** (papel:
admin...)". Abaixo aparece a *SQL que o servidor executou* (mostramos de propósito
para fins didáticos):

```sql
SELECT id, username, papel FROM usuarios WHERE username = 'admin' AND senha_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
```

> Esse hash comprido é o `SHA2('admin123', 256)`. Repare: a senha nunca trafega
> em texto puro dentro do `WHERE` — o app calcula o hash e compara com o hash
> guardado no banco.

---

## Parte B — O ataque: bypass com comentário

Agora entramos como admin **sem** a senha.

1. Volte para <http://localhost:3000>.
2. No campo **Usuário**, digite exatamente:

   ```
   admin' -- 
   ```

   ⚠️ **Atenção ao espaço no fim!** É `admin`, aspa simples, espaço, dois
   traços, espaço. O espaço depois de `-- ` é obrigatório no MySQL.
3. Deixe a **Senha em branco** (ou digite qualquer coisa — dá no mesmo).
4. Clique **Entrar**.

**Resultado esperado:** "✅ Autenticado como **admin**". A SQL executada mostra
por quê:

```sql
SELECT id, username, papel FROM usuarios WHERE username = 'admin' --  AND senha_hash = '<hash da senha vazia>'
```

Tudo o que vem depois de `-- ` (inclusive o `AND senha_hash = ...`) virou
**comentário**. Sobrou `WHERE username = 'admin'`, que casa com o admin.
Entramos. 🎭

> 🧩 **Detalhe importante:** isso só funciona porque a query da app é montada
> numa **única linha** (o `-- ` comenta apenas até o fim da linha). Se o
> `AND senha_hash` estivesse numa linha separada, a checagem de senha
> sobreviveria e o bypass falharia. Veja a nota no doc 02.

### Se o `-- ` não funcionar, use `#`

Alguns campos "comem" o espaço final. Alternativa equivalente:

```
admin'#
```

O `#` comenta o resto da linha sem precisar de espaço.

---

## Parte C — Variação: o clássico `OR '1'='1'`

Nem sempre o atacante sabe um nome de usuário. Este payload não precisa:

1. Campo **Usuário**:

   ```
   ' OR '1'='1' -- 
   ```
2. **Senha** em branco. Clique **Entrar**.

**Resultado esperado:** autentica como o **primeiro** usuário da tabela. A SQL:

```sql
SELECT id, username, papel FROM usuarios WHERE username = '' OR '1'='1' --  AND senha_hash = '...'
```

`'1'='1'` é **sempre verdadeiro**, então o `WHERE` retorna **todas** as linhas;
o app usa a primeira e considera você logado.

> Quer escolher a conta? Use:
> `naoexiste' OR papel='admin' -- ` para forçar quem tem papel de admin.

---

## Parte D — O antídoto: mesmo ataque na app SEGURA

Agora o contraste, que é o coração da aula.

1. Abra <http://localhost:3001> (app **segura**).
2. Campo **Usuário**: `admin' -- `  (o mesmo payload da Parte B)
3. Senha em branco. Clique **Entrar**.

**Resultado esperado:** ❌ "Usuário ou senha inválidos." **Sem bypass.**

Por quê? A app segura usa **prepared statement**:

```js
// ✅ SEGURO
const sql = 'SELECT id, username, papel FROM usuarios WHERE username = ? AND senha_hash = ?';
const [rows] = await pool.execute(sql, [username, senhaHash]);
```

O texto `admin' -- ` é enviado ao banco como **valor literal** do parâmetro.
O MySQL procura, ao pé da letra, um usuário chamado `admin' -- ` — que não
existe. A aspa não "escapa" para o código, porque dado e código viajam por
caminhos separados. (Detalhes no doc 05.)

Ainda por cima, a app segura **valida o formato** do usuário com uma allowlist
(`^[A-Za-z0-9._@-]+$`); um `admin' -- ` cheio de aspas e espaços já é recusado
antes mesmo de tocar o banco.

---

## Tabela antes/depois

| Payload no campo Usuário | App vulnerável (:3000) | App segura (:3001) |
|--------------------------|------------------------|--------------------|
| `admin` + senha `admin123` | ✅ entra (login real) | ✅ entra (login real) |
| `admin' -- `             | ⚠️ entra **sem senha** | ❌ inválido |
| `' OR '1'='1' -- `       | ⚠️ entra como 1º usuário | ❌ inválido |

---

## O que dizer para a turma (resumo de 20 segundos)

> "A mesma tela, os mesmos payloads. Na versão que **concatena texto**, a aspa
> do atacante vira código e derruba a checagem de senha. Na versão com
> **prepared statement**, a aspa é só um caractere qualquer do nome — o banco
> nunca a interpreta como comando. A correção não foi 'bloquear a aspa': foi
> **parar de misturar dado com código**."

➡️ Próximo: [`04-demo-union-extraction.md`](04-demo-union-extraction.md) —
vazando usuários e hashes pela busca de produtos.
