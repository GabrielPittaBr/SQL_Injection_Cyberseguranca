# 07 — Roteiro da apresentação (~18 minutos)

Roteiro cronometrado para apresentar o laboratório casando **fala** + **demo**.
Os tempos são um guia; ajuste ao seu ritmo. Total-alvo: **~18 min** + perguntas.

> ✅ **Checklist antes de começar** (faça 5 min antes, não no palco):
> - [ ] MySQL local no ar e scripts `db/` já aplicados (schema, seed, least_privilege).
> - [ ] App vulnerável rodando em <http://localhost:3000>.
> - [ ] App segura rodando em <http://localhost:3001>.
> - [ ] Duas abas do navegador já abertas (uma em cada porta).
> - [ ] `payloads.md` aberto num editor para copiar/colar rápido.
> - [ ] Zoom da fonte do navegador aumentado (a plateia precisa ler a query).
> - [ ] Se já rodou a demo bônus destrutiva antes, recrie o banco reaplicando
>       `db/schema.sql` e `db/seed.sql`.

---

## ⏱️ Bloco 0 — Abertura e aviso ético (0:00–1:30)

**Fale:**
> "Hoje vou mostrar, na prática, uma das falhas mais comuns e perigosas da web:
> SQL Injection. Tudo aqui roda **só na minha máquina**, num ambiente **isolado
> e de propósito vulnerável**. O objetivo é **defender melhor** — testar sistemas
> sem autorização é crime. Combinado? Então bora."

**Mostre:** o banner vermelho "APP VULNERÁVEL" e o verde "APP SEGURA" — a mesma
loja, duas versões.

---

## ⏱️ Bloco 1 — O conceito em 90 segundos (1:30–3:00)

**Fale (com a analogia do doc 01):**
> "Imagina um assistente que executa o que está escrito num papel. Você fez um
> formulário: 'traga o prontuário de ______'. Se ele lê o texto do cliente
> **como se fosse ordem sua**, um espertinho escreve 'traga TODOS e queime o
> arquivo' — e ele obedece. SQL Injection é isso: o **dado** do usuário virando
> **código** do sistema. A frase-chave da aula é: **dado nunca deveria virar
> código**."

---

## ⏱️ Bloco 2 — Demo 1: Login bypass (3:00–7:00)

**Passo a passo (doc 03):**

1. **(3:00) Login normal.** Na app :3000, entre com `admin` / `admin123`.
   > "Login funciona normal. Repare que embaixo eu mostro a query executada —
   > só para a gente enxergar o que acontece por baixo."

2. **(4:00) O ataque.** No campo Usuário, cole `admin' -- ` (senha em branco).
   > "Não sei a senha do admin. Vou digitar isto no usuário..."
   Clique Entrar → entrou como admin.
   > "Entrei. Olhem a query: minha aspa fechou o texto e o `-- ` **comentou** a
   > checagem de senha. Sobrou só `WHERE username = 'admin'`."

3. **(5:15) Variação.** Cole `' OR '1'='1' -- `.
   > "Nem preciso saber um nome: `'1'='1'` é sempre verdade, então o filtro casa
   > com todo mundo e ele me loga no primeiro usuário."

4. **(6:00) O antídoto.** Na app :3001, cole o **mesmo** `admin' -- `.
   > "Mesma tela, mesmo payload, versão corrigida... **inválido**. Aqui a aspa é
   > só um caractere do nome — o banco procura um usuário chamado `admin' -- `,
   > que não existe. Já explico por quê."

**Transição:** "Se dá pra entrar sem senha, será que dá pra **roubar** as senhas?"

---

## ⏱️ Bloco 3 — Demo 2: UNION / vazamento (7:00–11:30)

**Passo a passo (doc 04):** vá para a busca da app :3000.

1. **(7:00) Provoca erro.** Busque só `'`.
   > "Uma aspa quebra a query e a app **cospe o erro cru do MySQL**. Isso já é
   > vazamento: o erro me dá pistas da estrutura."

2. **(8:00) Conta as colunas.** Busque `' ORDER BY 4 -- ` (ok) e depois
   `' ORDER BY 5 -- ` (erro).
   > "Subindo o número até dar erro, descubro que a query tem **4 colunas**.
   > Preciso disso pro próximo passo."

3. **(9:15) Extrai as credenciais.** Busque:
   ```
   zzz' UNION SELECT 1, username, senha_hash, papel FROM usuarios -- 
   ```
   > "O `UNION` cola um segundo SELECT — puxo `username` e `senha_hash` da tabela
   > de usuários pra dentro da lista de produtos. E aqui está: **todos os
   > usuários e seus hashes de senha**, tudo pelo campo de busca."

4. **(10:30) O antídoto.** Cole o mesmo payload na busca da app :3001.
   > "Versão segura: ele **procura um produto com esse nome esquisito**, não acha
   > nada, e nada vaza. O `UNION` virou texto de busca, não comando."

---

## ⏱️ Bloco 4 — Por que a versão segura resiste (11:30–15:00)

**Mostre o código lado a lado (docs 05):**

1. **(11:30) A causa.**
   > "A app vulnerável **concatena** o texto na string SQL. Aí a aspa do atacante
   > vira código. É a fronteira dado × código se rompendo."

2. **(12:30) A correção — prepared statement.** Mostre o `pool.execute(sql, [params])`.
   > "Na segura, o comando vai com **buracos `?`** e os valores vão **separados**.
   > O banco fixa a forma da query antes de ver os dados. O que você digita nunca
   > mais é relido como SQL. É o conserto **de raiz** — não é 'bloquear aspa'."

3. **(13:30) `query()` vs `execute()`.**
   > "No mysql2, o problema não é o método `query` em si — é a **concatenação**.
   > `query` com `?` também é seguro. Usei `execute` na versão segura porque
   > deixa explícito que é um prepared statement. Regra pra levar: **sempre `?`,
   > nunca `${input}`**."

*(Se sobrar tempo, cite que `?` é só para valores; para nome de coluna, allowlist.)*

---

## ⏱️ Bloco 5 — Defesa em camadas (15:00–17:00)

**Fale (doc 06), mostrando o quadro das camadas:**
> "Prepared statement já resolve. Mas segurança boa não aposta tudo numa barreira
> só. A versão segura tem **quatro camadas**:
> 1. **Prepared statements** — impede a injeção.
> 2. **Validação/allowlist** — recusa entrada fora do formato.
> 3. **Erro genérico** — não mostra o erro do MySQL na tela; loga no servidor.
> 4. **Menor privilégio** — o usuário do banco só tem `SELECT`; nem se quisesse
>    conseguiria dar `DROP` ou `DELETE`."

**Demo relâmpago (opcional, 30s):** conecte como `app_seguro` e rode
`DELETE FROM produtos;` → "command denied".
> "A última camada segurando o golpe."

---

## ⏱️ Bloco 6 — Fechamento (17:00–18:00)

**Fale:**
> "Resumindo: SQL Injection nasce de **misturar dado com código**. A cura é
> **prepared statement** — parametrizar sempre. Em volta disso, camadas:
> validar entrada, esconder erros e dar o **mínimo de privilégio** ao banco.
> A mesma tela pode ser um desastre ou um cofre — a diferença é **como** o
> código conversa com o banco. Perguntas?"

---

## 🅰️ Apêndice — Se der algo errado no palco (plano B)

- **App não abre:** confira o terminal; rode `npm run dev` de novo. Veja o
  `README.md` (seção "Como rodar").
- **Erro de conexão com o banco:** confira se o serviço do MySQL está rodando e
  se a senha no `.env` está correta.
- **`-- ` não comenta no navegador:** troque por `#` (ex.: `admin'#`). Explique
  que o navegador "comeu" o espaço obrigatório do `-- `.
- **UNION dá erro de coluna:** confirme que são **4** colunas
  (`id, nome, descricao, preco`) e que o `UNION SELECT` tem exatamente 4 itens.
- **Banco "bagunçado" por causa da demo bônus destrutiva:** recrie do zero
  reaplicando `db/schema.sql` e `db/seed.sql`.

---

## ⏱️ Tabela de tempo (colável no monitor)

| Bloco | Tema | Início | Fim |
|-------|------|--------|-----|
| 0 | Abertura + ética | 0:00 | 1:30 |
| 1 | Conceito (analogia) | 1:30 | 3:00 |
| 2 | Demo login bypass | 3:00 | 7:00 |
| 3 | Demo UNION / vazamento | 7:00 | 11:30 |
| 4 | Por que a segura resiste | 11:30 | 15:00 |
| 5 | Defesa em camadas | 15:00 | 17:00 |
| 6 | Fechamento | 17:00 | 18:00 |
