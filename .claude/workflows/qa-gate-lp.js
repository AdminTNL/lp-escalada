export const meta = {
  name: 'qa-gate-lp',
  description: 'Gate de 6 perguntas independentes (converte/explica/correto/bonito/gruda o jovem/acessivel) antes de aprovar uma versao da LP Escalada',
  phases: [
    { title: 'Revisao', detail: '6 agentes, cada um julga uma pergunta isoladamente' },
  ],
}

const URL = (args && args.url) ? args.url : 'https://dev.escaladagame.com.br'

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['SIM', 'NAO'] },
    summary: { type: 'string' },
    blocking_issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          location: { type: 'string' },
          issue: { type: 'string' },
          fix_suggestion: { type: 'string' },
        },
        required: ['location', 'issue'],
      },
    },
  },
  required: ['verdict', 'summary', 'blocking_issues'],
}

const BROWSER_TIP = `Dica tecnica: pra ver a pagina, carregue ${URL} numa aba (ToolSearch "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp" primeiro). Crie sua PROPRIA aba nova (tabs_create_mcp), nao reaproveite abas de outras sessoes. Pra ver a versao mobile, clique no botao "Mobile" no canto superior direito da propria pagina (ele simula um iPhone 15). Se depois de trocar de modo ou esperar uma animacao o conteudo parecer travado/parado no meio, role ou clique de leve na area pra forcar uma atualizacao visual antes de concluir qualquer coisa -- isso e' um artefato conhecido de renderizacao em abas automatizadas (a aba simulada perde foco real do SO e o browser posterga repaint), nao um bug do site. Feche sua aba ao terminar.\n\nArtefato conhecido adicional, especifico de :hover: a acao "hover" desta ferramenta de automacao (e eventos sinteticos mouseenter/mouseover/mousemove via JS) as vezes NAO aciona a recomputacao real de estilo -- "elemento.matches(':hover')" pode reportar true enquanto "getComputedStyle" continua mostrando o valor sem hover, de forma inconsistente entre tentativas na mesma pagina (confirmado inclusive em regras :hover simples, sem media query, sem conflito de especificidade -- nao e' bug de CSS). Se um teste de hover via automacao nao mostrar mudanca visual, NAO trate isso sozinho como prova de que o hover esta quebrado: leia o CSS-fonte (Grep/Read em "C:\\Users\\gabri\\Desktop\\tnl\\lp-escalada\\dev\\index.html") pra confirmar se a regra ":hover" existe e faz sentido antes de reportar como blocking issue.`

const CONTEXT = `Contexto: Escalada Sebrae e' um programa de empreendedorismo gamificado pra estudantes (14+ anos, vinculados a uma instituicao de ensino) e professores/educadores/multiplicadores, Ciclo 2026, Brasil. Mecanica: usuario se cadastra, completa trilhas/modulos/missoes/quizzes, ganha pontos, sobe num ranking MENSAL; os 20 melhores do mes disputam o GameShow Escalada ao vivo, o vencedor leva um smartphone. Professores tem trilha propria (modulos v3.5, com quizzes e artigos) e pontuam por cada estudante que vinculam e mantem engajado, premio: voucher de R$1.000/mes por ate 3 meses. Esta e' uma landing page em staging (${URL}), sendo redesenhada pra melhorar conversao, principalmente pro publico jovem (gen Z / gen Y). Mudancas recentes: um efeito de confete que estoura do topo do card de ranking pra cima da pagina quando "Voce" chega ao 1o lugar (estilo level-up), cards entrando em cascata em vez de bloco unico, setas desenhando entre os passos da secao "como funciona", hover nos cards no desktop, e lavagens de cor sutis (verde/azul/magenta) nas secoes claras pra quebrar a monotonia de fundo branco corrido que o usuario reclamou existir antes.`

const QUESTIONS = [
  {
    key: 'converte', priority: 1,
    prompt: `Pergunta 1 (a MAIS importante -- prioridade maxima): ISSO CONVERTE?\n\n${CONTEXT}\n\n${BROWSER_TIP}\n\nAvalie ${URL} como funil de conversao pro cadastro no programa. So' responda SIM se: (a) o CTA principal ("Quero participar") e' obvio na primeira dobra tanto no desktop quanto no mobile; (b) a proposta de valor (o que e', pra quem, o que se ganha) fica clara em poucos segundos sem precisar rolar muito; (c) nao ha friccao obvia -- texto confuso, CTA escondido/cortado, excesso de rolagem antes de qualquer chamada pra acao; (d) elementos de urgencia/prova social reforcam a decisao de entrar agora. Contexto real de dados: o site antigo tinha 0,2% de engajamento mobile contra 76% no desktop, e o elemento mais clicado de longe era o botao de fechar um popup intrusivo -- friccao precoce e' o maior risco de conversao aqui. Coloque-se no lugar de um estudante de 14-17 anos ou de um professor chegando por um anuncio: em menos de 10 segundos, em AMBOS os formatos, voce saberia o que fazer e por que? Reporte o veredito via a ferramenta de saida estruturada.`,
  },
  {
    key: 'explica', priority: 2,
    prompt: `Pergunta 2: ISSO EXPLICA?\n\n${CONTEXT}\n\n${BROWSER_TIP}\n\nAvalie se um visitante que nunca ouviu falar do Escalada entende, so' lendo ${URL}: o que e' o programa, quem pode participar (estudante 14+ vinculado a instituicao de ensino vs. professor/educador/multiplicador), como se pontua (trilhas, modulos, missoes, streak), o que e' o ranking mensal, o que e' o GameShow Escalada, e qual e' o premio de cada trilha (estudante: smartphone pro vencedor do GameShow; professor: voucher de R$1.000/mes por ate 3 meses). So' responda SIM se AMBOS os publicos saem com uma explicacao completa e sem ambiguidade do que fazer e o que ganham, sem jargao nao explicado.`,
  },
  {
    key: 'correto', priority: 3,
    prompt: `Pergunta 3: ISSO ESTA CORRETO?\n\n${CONTEXT}\n\nVoce tem acesso de leitura ao sistema de arquivos. Cruze CADA alegacao factual da PAGINA PRINCIPAL de ${URL} (index.html: premios, elegibilidade, mecanica de pontos, existencia da trilha do professor em modulos v3.5, ciclo/datas, etc.) contra as fontes oficiais: leia "C:\\Users\\gabri\\Desktop\\tnl\\B.O-s-Escalada\\utilitarios\\REGULAMENTO GERAL - CICLO 2026.md" e explore o repositorio "C:\\Users\\gabri\\Desktop\\tnl\\B.O-s-Escalada" (Grep/Glob a vontade) atras de qualquer coisa que contradiga o texto da LP. Aponte QUALQUER alegacao que pareca inventada, desatualizada ou nao confirmada pelas fontes -- inclusive a URL do botao de professor "https://escalada.me/lpescalada-multiplicadores1", que e' um palpite NAO confirmado (sinalize isso explicitamente se ainda estiver la, como blocking issue mesmo que o resto esteja correto). ${BROWSER_TIP}\n\nATENCAO SOBRE O ESCOPO -- a subpagina ${URL}/faq/ busca seu conteudo em TEMPO DE EXECUCAO de um arquivo remoto (Supabase storage, export de WordPress/Elementor: "https://database.tnledu.shop/storage/v1/object/public/scripts-escalada/scripts/index-lp.html") que NAO faz parte do repositorio "lp-escalada" e nao pode ser editado por quem trabalha nesse repositorio -- e' mantido por outro sistema/time. Se voce achar erros factuais dentro de ${URL}/faq/ especificamente (nao na pagina principal), LISTE-OS em blocking_issues marcando claramente "(fora do repo lp-escalada, conteudo remoto)" no campo location, mas NAO deixe isso sozinho derrubar o veredito pra NAO -- o veredito desta pergunta deve refletir a CORRECAO DA PAGINA PRINCIPAL (index.html), que e' o que de fato pode ser corrigido aqui. So' responda NAO por causa da pagina principal, ou se a propria pagina principal linkar/citar um numero ou data especifica do FAQ remoto de um jeito que ela mesma nao consegue sustentar.\n\nSo' responda SIM se nao sobrar nenhuma alegacao sem lastro nas fontes NA PAGINA PRINCIPAL.`,
  },
  {
    key: 'bonito', priority: 4,
    prompt: `Pergunta 4: ISSO ESTA BONITO?\n\n${CONTEXT}\n\n${BROWSER_TIP}\n\nAvalie a qualidade visual de ${URL} como um designer senior exigente avaliaria -- tipografia, espacamento, hierarquia, paleta, consistencia, qualidade das animacoes (o rank card no hero, a trilha SVG da escada, as setas da secao "como funciona", o confete quando "Voce" chega ao 1o lugar, o hover dos cards), e se o conjunto parece artesanal e intencional ou generico/"cara de IA". Role a pagina inteira no desktop E veja no mobile (botao "Mobile"). Preste atencao especial em: variedade visual entre secoes consecutivas (o usuario reclamou que 2-3 secoes seguidas ficavam com o mesmo fundo branco e nada de diferente -- isso acabou de ser mexido nesta rodada, avalie se resolveu de verdade ou se ainda ha trechos monotonos), e se o efeito de confete parece um burst de nivel/premio bem feito ou tosco. So' responda SIM se voce recomendaria essa pagina como referencia de qualidade, sem ressalvas.`,
  },
  {
    key: 'gruda_jovem', priority: 5,
    prompt: `Pergunta 5: ISSO GRUDA O JOVEM?\n\n${CONTEXT}\n\n${BROWSER_TIP}\n\nAvalie ${URL} como se voce fosse um adolescente de 13-17 anos com o celular na mao, tempo de atencao curto, decidindo em segundos se fica ou sai. Criterios: a linguagem soa genuina/direta ou corporativa/forcada? Existe pico de dopamina real (o ranking mudando de posicao com glow, o confete, urgencia, premio concreto) ou e' so' texto explicativo? O tom tenta ser "descolado" de um jeito constrangedor (cringe) ou acerta o equilibrio? A experiencia parece um joguinho/desafio ou um formulario disfarcado? So' responda SIM se voce, no papel desse adolescente, sentiria vontade real de continuar e se cadastrar -- nao so' entenderia a proposta.`,
  },
  {
    key: 'acessivel', priority: 6,
    prompt: `Pergunta 6: ISSO ESTA ACESSIVEL?\n\n${CONTEXT}\n\n${BROWSER_TIP} Voce tambem pode ler o HTML-fonte direto em "C:\\Users\\gabri\\Desktop\\tnl\\lp-escalada\\dev\\index.html".\n\nVerifique: contraste de cor texto/fundo em cada secao (inclusive nas novas lavagens de cor claras e no hero escuro), se as animacoes respeitam "prefers-reduced-motion" (confete, reveals em cascata, pulso do CTA, troca de posicao no rank), se botoes/links sao elementos semanticos navegaveis por teclado (nao divs clicaveis disfarcados), se icones decorativos tem aria-hidden e icones informativos tem alternativa textual, se o FAQ em <details>/<summary> funciona sem mouse, e se os alvos de toque no mobile tem tamanho razoavel. So' responda SIM se nao sobrar nenhuma barreira real de acessibilidade.`,
  },
]

phase('Revisao')
const results = await parallel(QUESTIONS.map(q => () =>
  agent(q.prompt, { label: `qa:${q.key}`, phase: 'Revisao', schema: VERDICT_SCHEMA })
    .then(v => ({ key: q.key, priority: q.priority, ...v }))
))

const answered = results.filter(Boolean)
const missing = QUESTIONS.filter(q => !answered.some(r => r.key === q.key))
const blocked = answered.filter(r => r.verdict !== 'SIM').sort((a, b) => a.priority - b.priority)
const approved = answered.filter(r => r.verdict === 'SIM')

return {
  url: URL,
  allApproved: blocked.length === 0 && missing.length === 0,
  approvedCount: approved.length,
  totalCount: QUESTIONS.length,
  missing: missing.map(q => q.key),
  results: answered.sort((a, b) => a.priority - b.priority),
}
