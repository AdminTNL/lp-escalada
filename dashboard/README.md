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

## Pins de instituição de ensino no mapa de Regionais (2026-11-05, liberado geral em 2026-11-11)

Ver detalhe completo (RPC, cobertura de dados, hierarquia por nível, a
2ª rodada que trocou `interactive:false` por popup) no `CLAUDE.md` do
repo `B.O-s-Escalada`. Resumo do lado frontend: `renderRegionaisTerritoryMap`
(index.html) busca `report=instituicoes_mapa` em paralelo (sem bloquear o
resto do render), e desenha 1
`L.circleMarker` por instituição visível no centroide do bounds do
polígono do município (`municipioBoundsByNorm`, já calculado pelo próprio
mapa). Cor por dependência administrativa (`dep`): laranja=federal,
roxo=estadual, azul=municipal, cinza=privada. Nível regional mostra só
federal; microrregião soma estadual; município mostra tudo.

Pin é `interactive:true` com popup (nome completo, dependência, pessoas e
atendimentos) — clicar exatamente em cima dele (raio de 6px) abre o
popup; clicar em qualquer outro ponto do mesmo polígono continua
navegando entre níveis normalmente. Validado ao vivo nas duas direções.

**Liberado geral em 2026-11-11** (antes gateado só pra
`admin@tironalua.com`, pra validação visual) — removido o `if
(isDashboardMasterAdmin())` (e a própria função/constante, que não tinha
mais nenhum uso) em `index.html`, nos dois pontos que ligavam a feature:
o fetch de `fetchInstituicoesMapa` e o early-return de `evaluateZoomBlend`
(o funil de zoom contínuo, ver subseção abaixo). O backend
(`dashboard_instituicoes_mapa_v1.sql`) já tinha a trava de UF normal
(mesmo padrão `dashboard_ufs_do_acesso` de qualquer outra RPC desta
pasta) desde antes — não precisou de nenhuma mudança lá. Qualquer
gestor/admin agora vê os pins da própria UF, igual ao resto do mapa.

### Funil de território + drill em município (2026-11-05, liberado geral junto)

Clicar 2x no MESMO município já selecionado entra em modo "drill"
(`selectMunicipio` → `drillIntoMunicipio`): esconde de uma vez as 4
camadas de SVG coropletico (`ctx.territoryLayer`/`ctx.coarseLayer`/
`ctx.regionalLayer`/`ctx.ufOutlineLayer`, guardadas em
`municipioDrillHiddenLayers` pra restaurar exatamente o mesmo conjunto),
monta um tile OpenStreetMap sob demanda (`ctx.osmTileLayer`, lazy — esse
mapa normalmente roda com `skipTileLayer:true`), dá zoom apertado no
município (`fitBounds(..., {pad: 0.08})`, mais folga que o 0.04 usado no
resto do mapa por não ter SVG de contexto em volta), e desenha 1 pin POR
INSTITUIÇÃO (sem agrupar) com posição espalhada em espiral a partir do
centroide (`spiralSpreadPositions` — sem geocodificação real de escola, é
a única posição disponível; o popup desse modo específico ganha a nota
"Posição aproximada dentro do município"). 2º clique no mesmo município
desfaz (`undrillMunicipio`).

Guarda defensiva (`if (isMunicipioDrilled) undrillMunicipio();`, primeira
linha de `focusOnRegionalCliente`/`focusOn`/`setViewLevel`, antes de
qualquer early-return existente) desfaz o drill sempre que o usuário
navegar pra fora dele por qualquer caminho, não só o breadcrumb. O
breadcrumb (`#regionaisFocusChip`, movido pro grupo DIREITO do header do
mapa, ao lado da legenda/botão Multiplicadores) ganha um 3º segmento com o
nome do município; o segmento "atual" virou clicável reusando a MESMA
função de navegação com a MESMA key (no-op fora do drill, desfaz só o
drill durante o drill, graças ao guard); um segmento ANCESTRAL desfaz o
drill E sobe de nível numa ação só.

Nível "município" sem drill não muda — continua mostrando os pins
agrupados (cluster com badge) de antes.

**Bug real achado e corrigido (2026-11-06), não é específico do drill —
canvas do território travado por cima do SVG**: a classe
`.regionais-territory-canvas-front` (adicionada por `focusOn()` ao entrar
em município via clique direto, pra forçar o canvas acima do SVG) nunca
era removida em NENHUM caminho de saída (`focusOnRegionalCliente(null)`,
`focusOn(null)`, `setViewLevel("microrregiao")`) — só a entrada via pills
limpava. Depois de sair do nível município por qualquer um desses 3
caminhos, o canvas (vazio) ficava travado acima do SVG pra sempre,
engolindo clique nos territórios seguintes ("mapa fica cinza"/"blocos não
clicáveis"). Bug pré-existente, exposto com muito mais frequência pelo
drill (todo clique em município agora entra nele). Fix: limpeza da classe
nos 3 caminhos — imediata quando a remoção é imediata, ou dentro do
`setTimeout` de `crossfadeRegionaisLevelLayers` (depois do fade de 1.1s
terminar) quando é via fade, pra não interferir no truque de ordem DOM que
o fade usa (`reorderTerritoryCanvasRelativeToSvg`).

**2ª causa raiz, mesma rodada — race condition entre o fade de 1.1s e o
drill**: `crossfadeRegionaisLevelLayers` agenda a remoção real das camadas
com `setTimeout(1100ms)`, checando só `hasLayer()` no disparo — se o
usuário entrasse/saísse do drill DENTRO desse intervalo, o timeout antigo
removia por engano uma camada que o drill tinha acabado de restaurar. Fix:
contador de geração (`layerTransitionGen`, incrementado por
`crossfadeRegionaisLevelLayers` E por `drillIntoMunicipio`/
`undrillMunicipio`) invalida timeouts obsoletos.

**Zoom travado dentro do drill, mesma rodada**: o mapa tinha `maxZoom:11`
fixo (adequado pro território inteiro, baixo demais pra ver uma cidade de
perto). Fix original: `ctx.map.setMaxZoom(REGIONAIS_DRILL_MAX_ZOOM)` (18)
ao entrar no drill, restaurado ao desfazer — **esse toggle foi removido
no mesmo dia** (ver "blend contínuo de zoom" abaixo), virou `maxZoom:18`
FIXO desde a criação do mapa (precisa de headroom em qualquer nível, não
só dentro do drill, pro blend contínuo completar).

**Blend contínuo de zoom revela o funil inteiro (2026-11-06, mesmo dia,
a pedido do Gabriel)**: ele reportou que não tinha como voltar do drill
dando zoom OUT manualmente — só clique no breadcrumb desfazia. Apontou um
mecanismo já aprovado em `C:\Users\gabri\Desktop\tnl\servicos\tnl-shortener\
admin\src\components\BrazilMap.tsx` (mapa Estado↔Município dos modais de
detalhamento de link: `zoomend`/`moveend` calculam um blend `[0,1]`
contínuo entre o zoom "raso" do território atual e o "fundo" do
candidato mais perto do centro do mapa, interpolando opacidade — scroll
sozinho atravessa níveis gradualmente). Pedido pra portar com Microrregião
como 3º nível no meio; escopo confirmado como **"os dois coexistem"**
(clique continua igual, zoom contínuo é uma SEGUNDA forma de navegar a
mesma hierarquia).

Diferença de lá pra cá: limiares de zoom aqui são calculados on-the-fly
via `ctx.map.getBoundsZoom(bounds, false)` por território (cada
microrregião/município tem um zoom natural próprio), não constantes
globais fixas como lá. `coarseLayer` (microrregiões) ganhou um
`L.svg({pane:"ufPane"})` PRÓPRIO (`coarseSvgRenderer`) — antes
compartilhava o `ufRenderer` com `regionalLayer`/`ufOutlineLayer`,
impossível de desvanecer independente deles. `evaluateZoomBlend()`
decide, pro nível atual, a fronteira relevante (pra dentro, candidato via
nearest-centroid; pra fora, território pai, sempre determinado) e aplica
opacidade nos containers isolados certos — ao cruzar o limiar, chama as
MESMAS funções de sempre (`focusOnRegionalCliente`/`focusOn`/
`drillIntoMunicipio`/`undrillMunicipio`), nunca duplica lógica.

**Peça mais arriscada**: `coarseLayer` troca de DADO por regional
(diferente de `territoryLayer`, sempre todo carregado) — sem pré-carregar
a candidata ANTES do commit, não haveria nada pra desvanecer. Fix:
`coarsePreviewRegional` rastreia a pré-carga especulativa, só no ramo
"nada focado" E `viewLevel==="regional"` de verdade (os pills soltos de
microrregião/município também batem "nada focado", mas não devem disparar
esse blend — checagem explícita evita reconstruir `coarseLayer` por
engano durante eles). `zoomSnap`/`zoomDelta` viraram `0.25` só nesse mapa
(`ensureMap(..., {fractionalZoom:true})`) — efeito colateral esperado: os
botões +/- de zoom ficaram mais lentos (4x mais cliques).

Validado ao vivo (Playwright) nas 3 fronteiras (Município↔Drill,
Regional↔Microrregião, Microrregião↔Município) — scroll contínuo nos dois
sentidos, breadcrumb/hotlist acompanhando o commit automático, clique
explícito continuando a funcionar igual (inclusive alternado com scroll na
mesma sessão). Nenhum bug novo encontrado. Cobertura parcial, não
blocante: combinações de clique-no-meio-do-scroll (interromper um blend
ainda não comprometido com um clique de navegação diferente) só foram
testadas num caso representativo — sem orçamento pra esgotar todas as
combinações nesta rodada.

**ATENÇÃO — redesenho pendente**: o design acima (nearest-centroid
escolhendo 1 território "em foco" sozinho durante o scroll) foi reportado
pelo Gabriel no mesmo dia como UX ruim ao vivo — zoom sem clique pode
"errar o alvo" (foca uma regional vizinha errada) e prender o usuário lá.
Redesenho pedido (zoom sem clique só revela detalhe geral, sem
selecionar/commitar 1 território sozinho) registrado em `tasks.md` no
repo `B.O-s-Escalada` — **ainda não implementado**, a pedido explícito
dele. Ver detalhe completo e a direção pedida pro redesenho em
`CLAUDE.md` (repo `B.O-s-Escalada`), seção do funil de território.

**Fernando de Noronha excluído do mapa de Regionais (2026-11-06)**: a
pedido do Gabriel, pra o mapa não "puxar" tanto a visualização de PE.
Causa raiz: `wholeUfBounds` (usado por `fitRegionaisViewport`) vinha de
`.getBounds()` na camada Leaflet com TODAS as features do GeoJSON bruto do
IBGE, mesmo as que não batem com `regionais_municipios` (essas já caíam em
`resolveFeatureInfo === null`, mas isso só pulava cor/contagem — a
geometria continuava na camada e no bounds). O arquipélago, a ~545km da
costa, inflava o bounds do estado inteiro e forçava um zoom bem mais
afastado. Fix: `REGIONAIS_EXCLUDED_CODAREAS` (novo Set, codarea IBGE
`2605459`) filtra Fernando de Noronha tanto do GeoJSON (antes de montar
qualquer camada) quanto do mapa codarea→nome — nunca chega a existir em
layer/bounds/agrupamento nenhum. Só afeta PE.

**QA exaustivo do funil de território (2026-11-06), após o Gabriel reportar
"experiência bem travada... MUITO bugado mesmo" — 2 bugs reais reproduzidos,
corrigidos, deployados e revalidados**: interação deliberadamente caótica
via Playwright (clique+scroll sem esperar, navegação por hash direta), com
hook de debug temporário (removido antes do deploy final).

1. **Bug do roteamento por hash** (`applyRegionaisHashDetail`): navegar —
   via voltar/avançar do navegador, link colado na mesma aba, ou hash
   editado na mão (não clique interno, que usa `pushState` de propósito sem
   disparar `hashchange`) — de um hash mais fundo (`municipio/<regional>/
   <microrregião>`) pra um mais raso da MESMA regional
   (`microrregiao/<regional>`) deixava a tela presa no nível/foco antigo.
   Causa raiz: o parsing nunca checava `levelRaw` de verdade, e só chamava
   `regionaisFocusOnMicrorregiao(microKey)` quando `microKey` existia —
   `regionaisFocusOnRegionalCliente(regionalKey)` sozinho é um no-op quando
   a regional já é a focada, então nada nunca desfocava a microrregiao mais
   funda. Fix: `regionaisFocusOnMicrorregiao(microKey || null)` sempre
   chamado — `focusOn(null)` desfoca de verdade (guard é só "key ===
   focusKey"), idempotente quando já não havia nada focado.
2. **Bug "bloco fica sem cor"** (`animateTerritoryLayerStyle`): município
   ficava com borda/cor de contorno corretas mas `fillOpacity` travado em 0
   (parece branco/apagado) — condição de corrida intermitente (~1 em cada
   3-4 tentativas de clique→scroll→clique sem esperar), não reproduzível
   via chamada síncrona direta das funções de foco. Causa raiz: a função
   lia `layer.options` (só mutado pelo próprio tick de animação) como
   "from" ao agendar uma nova animação — se uma 2ª chamada pro mesmo layer
   chegasse antes do 1º frame da 1ª animação rodar, e o alvo pedido
   calhasse de bater com esse valor antigo, o check de "no-op real"
   cancelava a 1ª animação antes dela aplicar qualquer frame, travando o
   layer pra sempre no valor de antes de tudo começar (cache otimista
   nunca mais re-tentava). Fix: parte da opacidade INTERPOLADA da animação
   pendente (não de `layer.options`) quando já existe uma em andamento.
   Validado: Araripina (64 atend., deveria ficar vermelho) aparecia
   completamente branco antes do fix na sequência exata que reproduzia o
   bug; depois do fix, aparece vermelho/laranja corretamente.

**Achados não-bugs, documentados pra não reinvestigar**: o estado "mapa
quebrado" (tile OSM encolhido, fundo vazio) só reproduziu disparando 3-4
eventos de `wheel` sintéticos SEM NENHUM intervalo entre eles (mais
agressivo que qualquer scroll real) — `leaflet-proxy` interno do Leaflet
fica com `scale()`/`translate3d()` extremo, mas autocorrige sozinho em
~3s sem nenhuma interação; não é código deste repo. Clique logo após load
fresco às vezes não registra via `browser_mouse_click_xy` (CDP), mas
sempre registrou via `dispatchEvent` (JS puro) — suspeita de peculiaridade
do CDP/Playwright, sem evidência de afetar clique real de mouse.

**Pins de IE virando pins de mapa de fato + hover/clique trocados
(2026-11-06), a pedido do Gabriel**: `L.circleMarker` → `L.marker` +
`L.divIcon` (SVG em gota, `institutionPinIcon`) — nota histórica: uma
tentativa anterior de `L.marker`+`divIcon` nunca abriu popup via automação
de clique (Playwright); trocado mesmo assim por pedido explícito, então se
isso voltar a falhar em teste automatizado não é bug novo. O que aparecia
ao CLICAR (popup) passou a aparecer ao HOVER (`showSharedTooltip`, mesmo
balão flutuante dos polígonos de território). Clique virou "zoom": num pin
agrupado (fora do drill), simula o drill-through completo (foca
regional/microrregião donas, se necessário, depois `selectMunicipio`) —
teleporta pro município do pin já drilado, de qualquer nível/UF, com
breadcrumb correto. Num pin individual DENTRO do drill, clique só dá
`setView` apertado centrado naquele ponto.

**Breadcrumb virou Leaflet control de verdade, empilhado, no canto do
MAPA (2026-11-06)**: `#regionaisFocusChip` saiu do HTML estático do
cabeçalho e passou a ser criado dentro de `renderRegionaisTerritoryMap`
como `L.control({position:"topright"})` — pedido explícito do Gabriel
("no canto direito do mapa, empilhado", não inline no cabeçalho do card).
Cada segmento (Regional/Microrregião/Município) é sua própria linha
(`flex-direction:column`), sem os separadores "›" antigos; o segmento
"current" (destaque visual) sempre é o mais interno — demovido pra
ancestral comum quando o 3º segmento (município drilado) é anexado.

**Bug real achado logo em seguida — clique em qualquer crumb resetava
TUDO**: `L.DomEvent.disableClickPropagation` só bloqueia `mousedown`/
`touchstart`/`dblclick`/`contextmenu`, não o `'click'` nativo — que ainda
bolhava até `ctx.map.on("click", resetFocus)` por baixo do control,
anulando o que o crumb acabara de fazer. Só passou a existir depois do
breadcrumb virar `L.control` (antes, fora do mapa, nunca alcançava o
`_container`). Fix: `e.stopPropagation()` nativo em cada handler de
crumb + `L.DomEvent.on(div, "click", stopPropagation)` no container.

**2ª rodada visual, mesmo dia (prints comparativos do Gabriel)**: trocado
o cartão único (fundo escuro translúcido com texto empilhado) por 3 pills
sólidos separados (fundo azul `var(--brand-primary)`→`var(--brand-primary-2)`,
texto branco), mesmo visual de `.uf-pill.active` já usado no app —
`.regionais-focus-chip` virou só um container transparente de layout,
cada segmento (`-crumb`/`-current`) carrega o próprio pill.

**Pins ganharam coordenada REAL, não mais só o centroide do município
(2026-11-06)**: o Gabriel reportou que um pin (escola real em Cabo de
Santo Agostinho/PE) aparecia longe do endereço de verdade no Google
Maps — esperado, `spiralSpreadPositions` sempre foi só aproximação. O
Censo Escolar do INEP (fonte de `public.schools`) não tem endereço/
coordenada, mas o Catálogo de Escolas (fonte irmã, publicada pronta pelo
pacote `geobr`/IPEA) tem — backfill de 98% das instituições
`type='basica'` em `public.schools.latitude`/`longitude` (ver
`B.O-s-Escalada/supabase/functions/instituicoes/geo_import/README.md`
pro processo completo). `dashboard_instituicoes_mapa_v1.sql` devolve
`latitude`/`longitude` agora; `updateInstitutionMarkers` usa a
coordenada real quando existir (pin individual no drill, pin de
instituição única na visão agrupada), só cai no fallback de espiral pras
~2% sem coordenada batida (e pra ensino superior, sem fonte equivalente).
Cluster (2+ instituições no mesmo pin) continua sempre no centroide —
marcador agregado por design.

## Fora do escopo desta POC

- Corrigir a falta de autenticação real do webhook `dash-escalada`/RPCs pra
  quem ainda acessa via Circle — débito pré-existente, documentado em
  `B.O-s-Escalada/CLAUDE.md`, não gerado por esta migração.
- Migrar de vez a página da Circle pra apontar pra essa versão nova, ou
  desativar a antiga — ficam as duas rodando em paralelo por enquanto.
- Qualquer outra página do dashboard-escalada original fora do escopo
  descrito acima (o pedido foi migrar o dashboard primeiro, como POC).
