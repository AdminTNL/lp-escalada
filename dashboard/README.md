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

**Importante**: o comando precisa rodar com o cwd DENTRO de `dashboard/`
(não na raiz do repo) — o `wrangler pages deploy [directory]` busca a pasta
`functions/` relativa ao cwd, não relativa ao `[directory]` passado. Rodar
da raiz com `wrangler pages deploy dashboard` faz o Functions bundle pegar
o `functions/` ERRADO (o da raiz do repo, só `api/trafego.js` da LP
principal) — todas as rotas `/auth/*`/`/api/*` silenciosamente viram 404
(caem no fallback SPA pro `index.html`), sem erro nenhum no deploy. Já
aconteceu uma vez nesta POC, custou um ciclo de debug até achar a causa.

## Limitação conhecida — login "Entrar com Google"

O login nativo (email/senha) fica 100% dentro de
`dashboard.escaladagame.com.br` — validado de ponta a ponta. **Login
social (Google) ainda tem um hop real pro domínio verdadeiro do Keycloak**
depois que o Google autoriza (`keycloak-escalada.tnledu.shop/realms/
escalada/broker/google/endpoint`).

Causa raiz identificada (não é bug do proxy): o Keycloak está com
`KC_HOSTNAME` fixo (`keycloak-escalada.tnledu.shop`), que faz ele ignorar o
`X-Forwarded-Host` que o Traefik já envia corretamente (confirmado via
access log do Traefik: o router novo — `keycloak-dashboard-poc@swarm` — é
escolhido certo, o middleware manda o header certo, o Keycloak é quem
ignora). Os dois routers do Traefik (`keycloak` e `keycloak-dashboard-poc`,
ver labels do service `keycloak_keycloak` no Portainer) já forçam valores
diferentes de `X-Forwarded-Host` cada um — removendo o `KC_HOSTNAME` fixo
(deixando dinâmico) deveria bastar, SEM quebrar a Circle (cujo router já
força o hostname real de qualquer forma). Confirmado também: Keycloak só é
alcançável via esses 2 routers (sem porta publicada direta), então não há
brecha nova.

**Tentativa real (2026-11-05) causou ~1min de indisponibilidade do
Keycloak/Circle** (erro de autenticação no Postgres, aparentemente não
relacionado — revertida a mudança e o problema persistiu por mais alguns
ciclos antes de se resolver sozinho; senha confirmada correta via teste
direto no Postgres). Provavelmente um soluço de orquestração do Swarm por
emitir updates em sequência rápida, não uma consequência lógica da mudança.
Mudança revertida, `KC_HOSTNAME` de volta ao valor fixo original. **Pendente
de nova tentativa**, fora de horário de pico, sem outra mudança em paralelo.

Já aplicado nesta sessão (fica, independente da decisão acima): client OAuth
do Google (`802193219150-rhvcnraa1cgh09ubrl3mehsup7kgdh5f.apps.googleusercontent.com`,
mesmo usado pela Circle) ganhou um redirect URI extra
(`https://dashboard.escaladagame.com.br/realms/escalada/broker/google/endpoint`)
no Google Cloud Console, projeto "Auth na Circle" — necessário pro dia que o
`KC_HOSTNAME` dinâmico for aplicado de vez.

## Fora do escopo desta POC

- Corrigir a falta de autenticação real do webhook `dash-escalada`/RPCs pra
  quem ainda acessa via Circle — débito pré-existente, documentado em
  `B.O-s-Escalada/CLAUDE.md`, não gerado por esta migração.
- Migrar de vez a página da Circle pra apontar pra essa versão nova, ou
  desativar a antiga — ficam as duas rodando em paralelo por enquanto.
- Qualquer outra página do dashboard-escalada original fora do escopo
  descrito acima (o pedido foi migrar o dashboard primeiro, como POC).
