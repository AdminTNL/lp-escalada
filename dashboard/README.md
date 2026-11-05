# Dashboard Escalada em dashboard.escaladagame.com.br (POC)

POC de migração: o dashboard-escalada, que hoje roda embutido na Circle
(`escaladaedu.circle.so`, via loader que busca `head.html`/`body.html` de um
bucket R2 em `assets-tnl.org` e faz chamadas diretas pro n8n/Supabase), passa
a rodar aqui, standalone, autenticado via Keycloak, **sem nenhuma chamada do
navegador pra outro domínio** — nem pro login, nem pros dados.

Motivação original: gestores relatando que certos painéis não abrem. Causa
provável: a cadeia de 4+ domínios diferentes (`circle.so`, `assets-tnl.org`,
`tnledu.shop` x2) é o tipo de padrão que firewalls corporativos/escolares
costumam bloquear seletivamente (`.shop` em particular é um TLD comum em
listas de bloqueio). Single-origin elimina essa classe de problema.

## Arquitetura

```
Browser (gestor)
   |  (único domínio: dashboard.escaladagame.com.br)
   v
Cloudflare Pages "escalada-dashboard" (Root Directory = dashboard/, projeto
separado do Pages principal da LP -- mesmo repo, path_includes=["dashboard/*"])
   |
   +-- /                        -> index.html (dashboard-escalada real, ver abaixo)
   +-- /auth/login              -> monta a URL de autorização apontando pro
   |                                PRÓPRIO domínio (/realms/...), nunca direto
   +-- /realms/[[path]]         -> proxy reverso do Keycloak real (reescrita
   |                                de texto/cookie/Location)
   +-- /resources/[[path]]      -> mesmo proxy, assets do tema de login
   +-- /auth/callback           -> troca code->token DIRETO com o Keycloak real
   |                                (servidor-a-servidor, valida assinatura via JWKS)
   +-- /auth/logout             -> limpa sessão própria + fecha SSO via /realms/
   +-- /auth/me                 -> {authenticated,email,name} ou 401
   +-- /api/dash                -> único chamador do webhook n8n dash-escalada
   |                                pra essa superfície; SEMPRE sobrescreve
   |                                email/p_email/email_admin pelo da sessão
   +-- /api/destaques-upload    -> idem, pro upload de foto de Destaques
   +-- /images/destaques-engajamento/*  -> proxy read-only das fotos (Supabase Storage)
   +-- /assets/*                -> estáticos locais (logo, ícone) que antes
                                     vinham de assets-tnl.org/netlify.app

Servidor-a-servidor (não passa pelo navegador do gestor, domínio não importa):
   Function --fetch--> keycloak-escalada.tnledu.shop (proxy /realms,/resources + token)
   Function --fetch--> webhookn8n.tnledu.shop/webhook/dash-escalada (dados)
   Function --fetch--> webhookn8n.tnledu.shop/webhook/destaques-engajamento-upload-foto
   Function --fetch--> database.tnledu.shop/storage/.../destaques-engajamento (fotos)
```

## `index.html` — como foi montado

Combinação direta de
`B.O-s-Escalada/paginas/dashboard-escalada/prod/head.html` +
`.../prod/body.html` (`<head>{head.html}</head><body><div id="tnl-app-root">
{body.html}</div></body>`), com estas mudanças pontuais na lógica JS (tudo o
resto — mapa Leaflet, Chart.js, gamificação, CSS — é idêntico ao que já roda
na Circle hoje):

1. **Identidade** (`gestorEmail()`/`gestorNomeCompleto()`): liam
   `window.circleUser`/`circleUserData` (só existiam dentro da Circle).
   Agora vêm de um `fetch("/auth/me")` disparado uma vez no load, cacheado
   em `__dashSession`.
2. **Base da API** (`callDashboardApi`/`SUPABASE_RPC.apiBase`): era
   `https://webhookn8n.tnledu.shop/webhook/dash-escalada`, agora é
   `/api/dash` (same-origin, mesmos query params de sempre).
3. **Upload de foto de Destaques**: era form real + iframe oculto direto
   pro n8n (truque necessário só por causa do bloqueio de CORS da Circle —
   ver `destaquesSubmitUploadViaHiddenForm` no histórico do head.html
   original). Agora é `fetch()` normal pro `/api/destaques-upload`
   (same-origin, sem CORS). A URL pública da foto também passou de link
   direto do Supabase Storage pra `/images/destaques-engajamento/...`.
4. Dois assets estáticos (logo do rodapé de impressão, ícone de bandeira)
   que vinham de `assets-tnl.org`/`mimiim.netlify.app` agora são arquivos
   locais em `dashboard/assets/`.

**Se um dia o `prod/head.html`/`prod/body.html` originais (repo
B.O-s-Escalada) ganharem uma feature nova**, ela precisa ser reportada
manualmente aqui — não há sincronização automática entre os dois. Ao
portar, reaplicar as mesmas 4 mudanças acima no trecho novo.

## Features que nasceram primeiro aqui (ainda não portadas pra Circle)

- **2026-11-05 — família "Instituição de Ensino" na página de Fontes**:
  agrupa participantes pelo campo de perfil `instituicao_ensino` (não por
  tag/regex, como geral/eventos/embaixadores/convites) — dimensão
  independente das outras famílias, uma pessoa pode aparecer em
  "instituicao" e em qualquer outra ao mesmo tempo. Backend em
  `dashboard_fontes_v2_interno.sql` (repo `B.O-s-Escalada`, commit
  `ed96d1c`); frontend aqui em `SOURCE_FAMILY_META`/
  `normalizeSourceFamily()` + 2 pontos de navegação (subnav da sidebar e
  dropdown de família). **Essa versão (standalone) recebeu a feature
  primeiro** — ainda não foi replicada em `prod/head.html`/`prod/body.html`
  da Circle. A chamada de detalhe por instituição (clique numa linha do
  ranking) cai graciosamente num "0 participantes": `dashboard_fonte_detalhe_v1.sql`
  não foi tocado nesta rodada (não tem um caminho de detalhe próprio pra
  instituição), fora de escopo por decisão deliberada.

- **2026-11-05 — métrica "Instituições de ensino" em Território > Cobertura
  territorial**: contagem de `instituicao_ensino` distintas entre quem teve
  atendimento no período filtrado (mesmo escopo das outras métricas de
  cobertura do mesmo card — UFs/cidades ativas, não inscritos). Campo novo
  `meta.coverage.instituicoes_distintas` em `dashboard_executivo_v2_interno.sql`
  (repo `B.O-s-Escalada`), consumido em `renderAggregated()` (`terrInstituicoes`).

## Setup (já feito, documentado pra rodar de novo/em outro lugar)

- **Keycloak** (realm `escalada`): client novo `dashboard-escaladagame`
  (confidential, `redirectUris=["https://dashboard.escaladagame.com.br/auth/callback"]`).
  Secret vivendo só como secret do Pages (`KEYCLOAK_CLIENT_SECRET`), nunca
  no repo.
- **Cloudflare Pages**: projeto `escalada-dashboard`, conectado ao MESMO
  repo GitHub (`AdminTNL/lp-escalada`) com `build_config.destination_dir=
  "dashboard"` e `source.config.path_includes=["dashboard/*"]` (só rebuilda
  quando algo aqui dentro muda) — criado via API, não precisa repetir a UI
  do Cloudflare Dashboard. Domínio customizado `dashboard.escaladagame.com.br`
  (CNAME pro `<project>.pages.dev`, mesmo padrão de `dev.escaladagame.com.br`).
  Secrets: `KEYCLOAK_CLIENT_SECRET`, `SESSION_SECRET` (assinatura HMAC da
  sessão própria, não é o token do Keycloak).

## Deploy

Esse projeto é git-connected (push em `main` sob `dashboard/**` dispara
build automático), **mas** também aceita deploy manual direto (usado
durante o desenvolvimento desta POC, mais rápido pra iterar):

```bash
cd dashboard
npx wrangler pages deploy . --project-name=escalada-dashboard --branch=main --commit-dirty=true
```

**Importante (wrangler local)**: o comando precisa rodar com o cwd DENTRO de
`dashboard/` (não na raiz do repo) — o `wrangler pages deploy [directory]`
busca a pasta `functions/` relativa ao cwd, não relativa ao `[directory]`
passado. Rodar da raiz com `wrangler pages deploy dashboard` faz o
Functions bundle pegar o `functions/` ERRADO (o da raiz do repo, só
`api/trafego.js` da LP principal) — todas as rotas `/auth/*`/`/api/*`
silenciosamente viram 404 (caem no fallback SPA pro `index.html`), sem erro
nenhum no deploy.

**Importante (build via GitHub)**: o projeto Pages precisa de
`build_config.root_dir="dashboard"` (NÃO `destination_dir`) pra resolver
`functions/` certo num build disparado por push. `destination_dir` sozinho
(o padrão usado por `lp-escalada-dev`, que nunca teve Functions próprias
pra expor esse bug) faz o build do GitHub cometer o MESMO erro do wrangler
local acima — já aconteceu nesta POC: um push normal (documentação, sem
tocar em `functions/`) disparou o auto-deploy, que silenciosamente serviu
a versão sem Functions por alguns minutos até o problema ser notado e a
config corrigida via API (`PATCH .../pages/projects/escalada-dashboard`
com `{"build_config":{"root_dir":"dashboard","destination_dir":""}}`).
Verificar sempre `/auth/me` (deve devolver JSON, nunca HTML) depois de
qualquer push nesta pasta.

## RESOLVIDO — login "Entrar com Google" também 100% same-origin

Login nativo (email/senha) E login social (Google) ficam 100% dentro de
`dashboard.escaladagame.com.br` — os dois validados de ponta a ponta (via
Playwright e via replay manual com `curl`/cookie jar), zero requisição pra
`tnledu.shop` em qualquer um dos dois fluxos.

**O que foi feito** (2026-11-05, em 2 rodadas):

1. **`KC_HOSTNAME` fixo removido** do service `keycloak_keycloak`
   (Portainer/`docker service update --env-rm KC_HOSTNAME`) — Keycloak passa
   a resolver o hostname dinamicamente via `X-Forwarded-Host` (já confiava
   nesse header, `KC_PROXY_HEADERS=xforwarded` já estava configurado). Os 2
   routers do Traefik (`keycloak`, `keycloak-dashboard-poc`) continuam
   forçando valores diferentes de `X-Forwarded-Host` cada um — a Circle
   nunca foi afetada, confirmado antes/depois.
2. **Client OAuth do Google** (`802193219150-rhvcnraa1cgh09ubrl3mehsup7kgdh5f.apps.googleusercontent.com`,
   mesmo usado pela Circle, projeto "Auth na Circle" no Google Cloud
   Console) ganhou um redirect URI extra:
   `https://dashboard.escaladagame.com.br/realms/escalada/broker/google/endpoint`.
3. **Bug real achado na 1ª rodada**: a regra do Traefik (`keycloak-
   dashboard-poc`, que só libera `X-Forwarded-Host` customizado quando a
   requisição carrega o header secreto `X-Dashboard-Proxy-Secret`) estava
   certa, mas o proxy (`functions/_lib/kcproxy.js`) **nunca mandava esse
   header de verdade** -- só existia no teste manual via `curl`. Fix: secret
   novo `DASHBOARD_PROXY_SECRET` (Cloudflare Pages secret, mesmo valor do
   env var do Traefik/Portainer) + `kcproxy.js` manda o header em toda
   chamada pro Keycloak real.
4. **Efeito colateral do fix #3**: como a autorização completa (incluindo o
   `iss` do id_token final) agora reflete o hostname resolvido na etapa de
   autorização (o nosso, não mais o real), a verificação de issuer em
   `functions/auth/callback.js` (`verifyIdToken`) precisou trocar de
   hardcoded `KEYCLOAK_ORIGIN` pra dinâmico (`${url.host}`) -- sem essa
   troca, TANTO o login nativo quanto o Google passaram a falhar com
   "issuer inesperado" (achado e corrigido na validação desta mesma rodada).

**Tentativa de remover `KC_HOSTNAME` causou ~1min de indisponibilidade do
Keycloak/Circle nas duas vezes que foi aplicada** (erro de autenticação no
Postgres, idêntico nas duas tentativas, se resolveu sozinho em ambas antes
de qualquer revert ter efeito real -- confirmado não relacionado ao
`KC_HOSTNAME`, provavelmente um soluço de orquestração do Swarm ao aplicar
qualquer `docker service update` nesse serviço). Se for repetir esse tipo de
mudança no futuro, esperar esse soluço inicial (~45-60s, 2 falhas) antes de
assumir que algo quebrou de vez.

## Auditoria de acesso (2026-11-05)

Como o painel agora exige login real e expõe dados sensíveis (PII de
inscritos, contatos, UF por UF), todo acesso é registrado server-side em
`public.dashboard_log_acessos` (repo `B.O-s-Escalada`,
`supabase/functions/dashboard_auditoria/01_dashboard_log_acessos.sql`) —
`email`, `acao`, `rota`/`report`, `detalhamento` (jsonb, nunca
senha/token), `ip`, `user_agent`, `referer`, `criado_em`.

**Por que não reaproveitar nem "sessão da plataforma" (`sessao_plataforma/`
no repo B.O-s-Escalada) nem o padrão de heartbeat em geral**: aquele
mecanismo existe porque a Circle não tem sessão de servidor verificada — é
inferência de presença no cliente. Aqui já existe sessão real (cookie
`esc_dash_session`, assinado, emitido só por login via Keycloak), então
login/logout reais já são fronteira de sessão confiável e cada chamada de
API já passa pelo middleware que resolve o email verificado — mais perto do
padrão de auditoria de ferramenta (`automater-de-envios/src/functions/
_audit.js`): logar uma ação discreta por vez, identidade já verificada.

**Instrumentação** — helper `functions/_lib/audit.js` (`logAcesso(request,
{email, acao, rota, report, detalhamento})`), sempre chamado via
`waitUntil(...)` (fire-and-forget, nunca atrasa nem derruba a resposta real
— só `console.warn` em erro) e sempre fazendo um `fetch` GET pro mesmo
webhook n8n que já serve o resto do dashboard
(`report=log_acesso` → RPC `dashboard_registrar_acesso`):

- `functions/_middleware.js` → `acao:'page_view'`, `rota: url.pathname`,
  depois de confirmar sessão válida (cobre hard refresh/carregamento de
  página; navegação interna da SPA via hash não bate no servidor).
- `functions/auth/callback.js` → `acao:'login'`, depois de `signSession`.
- `functions/auth/logout.js` → `acao:'logout'` (lê a sessão ANTES de
  invalidar o cookie, senão perde o email de quem saiu).
- `functions/api/dash.js` → `acao:'api_call'`, `report:` o `?report=`
  pedido, `detalhamento:` os demais query params (exceto
  email/p_email/email_admin/report). **Ponto de maior valor**: cada troca
  de página na SPA já dispara um `report` característico
  (main/sources/fonte_detalhe/regionais_stats/gestor_convites/
  destaques_*), então isso também cobre "quais rotas visita" na prática,
  sem precisar de rastreio de rota no cliente (decisão deliberada: não
  replicar `estudo-de-rotas.js`/hook de `pushState` nesta rodada).
- `functions/api/destaques-upload.js` → `acao:'upload_destaque'`,
  `detalhamento:{circle_id,ext}`.

Consulta (sem tela própria no painel por ora — decisão deliberada, "só
registrar" no escopo desta rodada): RPC `dashboard_log_acessos_listar`
(filtros opcionais `p_email`/`p_acao`/`p_date_from`/`p_date_to`/`p_limit`)
ou SQL direto em `database.tnledu.shop/pg/query`.

Validado de ponta a ponta em produção (Playwright, conta real
`admin@tironalua.com`): login via Google → linha `login`; navegação real
(Visão geral/Fontes/Meus convites) → linhas `page_view`+`api_call` com
`report` e `detalhamento` certos (`ip`/`user_agent`/`referer` populados);
logout → linha `logout`. Nenhuma lentidão perceptível (fire-and-forget via
`waitUntil`).

**Cópia de contato de multiplicador (sem botão/handler dedicado)**: o
email/telefone de um multiplicador (campo `#sourceDetailContact`, dentro
do modal de detalhamento de fonte, só preenchido quando o backend libera
pra UF do gestor) não tem botão de "copiar" — a pessoa só seleciona o
texto e aperta Ctrl+C. Um único `document.addEventListener('copy', ...)`
cobre isso (o evento dispara pra qualquer cópia na página, escopado aqui
pelo elemento onde a seleção ocorreu, não por regex de conteúdo) e manda
`acao:'copy_contato_multiplicador'` (com `fonte`/`family`/`uf`/`texto`)
pro endpoint novo `/api/log-evento` — dedicado a eventos client-side que o
backend não tem visibilidade natural nenhuma, reaproveitando o mesmo
`logAcesso`. Deliberadamente NÃO cobre os botões "Copiar link" de
convite/regional (usam `navigator.clipboard.writeText`, que não dispara o
evento `copy` do DOM — mecanismo diferente, fora de escopo a pedido
explícito do Gabriel).

**Exportar PDF de fonte também registrado**: `exportSourceDetailReport()`
usa `window.print()` (motor de impressão nativo do navegador) — 100%
client-side, sem nenhuma chamada de rede, então não tinha nenhum log
natural (diferente de "baixar contatos", que já passa por
`report=fonte_contatos`). Ganhou `logEventoCliente('export_pdf_fonte', ...)`
logo antes de `window.print()`, com `fonte`/`family`/`uf`/`date_from`/
`date_to` do contexto do modal aberto.

**Bug de encoding achado e corrigido nesta rodada** (afeta qualquer
`detalhamento` com acento, não só este): o node `HTTP Request` nativo do
n8n corrompia texto UTF-8 multibyte tanto montando a chamada pro Supabase
quanto parseando a resposta — corrigido no workflow (Code node com
`this.helpers.httpRequest`, bypassando o node nativo) + transporte do
`detalhamento` em base64. Detalhe completo na skill `n8n-flows` (regra 5),
não neste README — é um bug de infraestrutura do n8n, não deste painel.

## Fora do escopo desta POC

- Corrigir a falta de autenticação real do webhook `dash-escalada`/RPCs pra
  quem ainda acessa via Circle — débito pré-existente, documentado em
  `B.O-s-Escalada/CLAUDE.md`, não gerado por esta migração.
- Migrar de vez a página da Circle pra apontar pra essa versão nova, ou
  desativar a antiga — ficam as duas rodando em paralelo por enquanto.
- Qualquer outra página do dashboard-escalada original fora do escopo
  descrito acima (o pedido foi migrar o dashboard primeiro, como POC).
