# 🧪 Laboratório de SQL Injection (educacional)

Um laboratório **didático** com duas versões da mesma aplicação web:

- 🔴 **App vulnerável** (porta **3000**) — com falhas de SQL Injection **de
  propósito**, para você *ver o ataque acontecer*.
- 🟢 **App segura** (porta **3001**) — a *mesma* aplicação, corrigida, para você
  *ver a defesa funcionar*.

Stack: **Node.js + Express + EJS + mysql2** (pool de conexões, `mysql2/promise`),
**MySQL 8** local, config por **dotenv**.

---

> # ⚠️ AVISO ÉTICO E DE ISOLAMENTO — LEIA ANTES DE RODAR
>
> - Este projeto é **intencionalmente vulnerável** e existe **apenas para fins
>   educacionais** (uma aula prática de segurança).
> - Rode **somente na sua máquina**, em ambiente **local e isolado**.
> - **JAMAIS** exponha estas aplicações (nem o MySQL) **à internet** ou a uma
>   rede compartilhada. Não faça deploy. Não coloque em servidor público.
> - Todos os dados são **fictícios**. Não use dados reais, nem as senhas daqui
>   em qualquer outro sistema.
> - Testar sistemas de terceiros sem autorização é **crime**. Use estas técnicas
>   só para **defender** melhor os seus próprios sistemas.

---

## 📁 Estrutura do projeto

```
.  (raiz do repositório)
├── README.md                 ← você está aqui
├── package.json
├── .env.example              ← copie para .env
├── db/
│   ├── schema.sql            ← cria database + tabelas
│   ├── seed.sql              ← dados 100% fictícios
│   └── least_privilege.sql   ← usuário MySQL restrito (só SELECT)
├── payloads.md               ← cheat-sheet de payloads prontos
├── app_vulneravel/           ← app com as falhas (porta 3000)
│   ├── server.js
│   ├── db.js
│   └── views/  (login.ejs, busca.ejs, resultado.ejs, layout.ejs)
├── app_seguro/               ← app corrigida (porta 3001)
│   ├── server.js
│   ├── db.js
│   └── views/
└── docs/                     ← material didático (leia em ordem, 01 → 07)
```

---

## ✅ Pré-requisitos

- **Node.js 18+** e **npm** — <https://nodejs.org>
- **MySQL 8** instalado e rodando na máquina — <https://dev.mysql.com/downloads/>

Todos os comandos abaixo rodam **na raiz do projeto** (a pasta deste `README.md`).

---

## 🚀 Como rodar

### 1) Aplique os scripts SQL (nesta ordem)

Substitua `-u root` pelo seu usuário administrador do MySQL:

```bash
mysql -u root -p < db/schema.sql
mysql -u root -p < db/seed.sql
mysql -u root -p < db/least_privilege.sql
```

> **Windows (PowerShell):** se `mysql` não for reconhecido, use o caminho
> completo do executável, por exemplo:
> `& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < db/schema.sql`

Isso cria o banco `sqli_lab`, popula com dados fictícios e cria o usuário
restrito `app_seguro` (só `SELECT`), usado pela app segura.

### 2) Instale as dependências do Node

```bash
npm install
```

### 3) Crie o seu arquivo `.env`

```bash
# Windows (PowerShell):
Copy-Item .env.example .env

# Linux / macOS:
cp .env.example .env
```

Edite o `.env` e aponte o usuário/senha do **root** (usado pela app vulnerável)
para os do **seu MySQL local**:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sqli_lab

# App vulnerável (privilégio alto — use seu root local):
DB_VULN_USER=root
DB_VULN_PASSWORD=SUA_SENHA_DO_ROOT
PORT_VULN=3000

# App segura (usuário restrito criado pelo least_privilege.sql):
DB_SEGURO_USER=app_seguro
DB_SEGURO_PASSWORD=senha_app_seguro
PORT_SEGURO=3001
```

> Para trocar a senha do usuário `app_seguro`, edite o `db/least_privilege.sql`
> (antes de aplicá-lo) **e** o `.env`.

### 4) Suba as duas apps

```bash
npm run dev
```

Roda a **vulnerável** e a **segura** juntas (via `concurrently`):

- 🔴 Vulnerável: <http://localhost:3000>
- 🟢 Segura:     <http://localhost:3001>

> Prefere terminais separados? Abra dois terminais e rode:
> ```bash
> npm run start:vuln     # porta 3000
> npm run start:seguro   # porta 3001
> ```

Pronto! Agora siga o passo a passo em
[`docs/03-demo-login-bypass.md`](docs/03-demo-login-bypass.md) e
[`docs/04-demo-union-extraction.md`](docs/04-demo-union-extraction.md).

---

## 🔑 Credenciais de teste (fictícias)

Para demonstrar o **login normal** antes de atacar:

| Usuário        | Senha        | Papel   |
|----------------|--------------|---------|
| `admin`        | `admin123`   | admin   |
| `joana.silva`  | `senha123`   | cliente |
| `carlos.souza` | `mudar@2024` | cliente |
| `mariana.lima` | `boasenha!`  | gerente |
| `pedro.alves`  | `pedrinho99` | cliente |

> São dados de laboratório. Não reutilize essas senhas em lugar nenhum.

---

## 🔁 Recomeçar do zero (resetar o banco)

Se você rodou a **demo bônus destrutiva** (stacked queries que apagam/alteram
dados) e quer o banco limpo, basta reaplicar o schema e o seed (o `schema.sql`
já faz `DROP TABLE` antes de recriar):

```bash
mysql -u root -p < db/schema.sql
mysql -u root -p < db/seed.sql
```

---

## 🩺 Solução de problemas

| Sintoma | Provável causa / solução |
|---------|--------------------------|
| App mostra erro de conexão ao subir | O MySQL não está rodando, ou a senha no `.env` está errada. Confira o serviço do MySQL e o `DB_VULN_PASSWORD`. |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL não está no ar (inicie o serviço) ou usa outra porta. Ajuste `DB_PORT` no `.env`. |
| `Access denied for user 'root'` | Senha do root errada no `.env`. Ajuste `DB_VULN_PASSWORD`. |
| `Access denied for user 'app_seguro'` | O `least_privilege.sql` não foi aplicado. Reaplique o script. |
| Porta 3000/3001 já em uso | Feche o processo que usa a porta, ou mude `PORT_VULN`/`PORT_SEGURO` no `.env`. |
| Login normal (`admin`/`admin123`) não funciona | O `seed.sql` não rodou. Reaplique o seed. |
| `-- ` não comenta no navegador | O navegador "comeu" o espaço obrigatório. Use `#` (ex.: `admin'#`). |

---

## 📚 Por onde estudar (ordem sugerida)

1. [`docs/01-o-que-e-sql-injection.md`](docs/01-o-que-e-sql-injection.md) — conceito e analogia.
2. [`docs/02-anatomia-do-ataque.md`](docs/02-anatomia-do-ataque.md) — como a query se rompe.
3. [`docs/03-demo-login-bypass.md`](docs/03-demo-login-bypass.md) — demo: entrar sem senha.
4. [`docs/04-demo-union-extraction.md`](docs/04-demo-union-extraction.md) — demo: vazar senhas.
5. [`docs/05-mitigacao-prepared-statements.md`](docs/05-mitigacao-prepared-statements.md) — a correção de raiz.
6. [`docs/06-mitigacao-defesa-em-camadas.md`](docs/06-mitigacao-defesa-em-camadas.md) — camadas extras.
7. [`docs/07-roteiro-da-apresentacao.md`](docs/07-roteiro-da-apresentacao.md) — roteiro da apresentação.
8. [`payloads.md`](payloads.md) — cheat-sheet para colar durante a demo.

---

## 🧑‍🏫 Resumo das diferenças (vulnerável × segura)

| Aspecto | 🔴 Vulnerável (:3000) | 🟢 Segura (:3001) |
|---------|----------------------|-------------------|
| Monta a query | Concatena input (`pool.query` + template string) | Prepared statement (`pool.execute` + `?`) |
| Validação de entrada | Nenhuma | Allowlist de formato + limite de tamanho |
| Erros na tela | Mostra `err.sqlMessage` cru | Mensagem neutra; detalhe só no log |
| Usuário do banco | `root` (privilégio máximo) | `app_seguro` (só `SELECT`) |
| `multipleStatements` | `true` (permite stacked queries) | `false` |
