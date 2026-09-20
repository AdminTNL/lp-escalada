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
    big_idea: {
      type: 'string',
      description: 'A mudanca estrutural/experiencial GRANDE que mais moveria o ponteiro nesta dimensao, mesmo se o veredito for SIM.',
    },
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
  required: ['verdict', 'summary', 'big_idea', 'blocking_issues'],
}

const BROWSER_TIP = `Dica tecnica: pra ver a pagina, carregue ${URL} numa aba (ToolSearch "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp" primeiro). Crie sua PROPRIA aba nova (tabs_create_mcp), nao reaproveite abas de outras sessoes. Pra ver a versao mobile, clique no botao "Mobile" no canto superior direito da propria pagina (ele simula um iPhone 15). Se depois de trocar de modo ou esperar uma animacao o conteudo parecer travado/parado no meio, role ou clique de leve na area pra forcar uma atualizacao visual antes de concluir qualquer coisa -- isso e' um artefato conhecido de renderizacao em abas automatizadas (a aba simulada perde foco real do SO e o browser posterga repaint), nao um bug do site. Feche sua aba ao terminar.\n\nArtefato conhecido adicional, especifico de :hover: a acao "hover" desta ferramenta de automacao (e eventos sinteticos mouseenter/mouseover/mousemove via JS) as vezes NAO aciona a recomputacao real de estilo -- "elemento.matches(':hover')" pode reportar true enquanto "getComputedStyle" continua mostrando o valor sem hover, de forma inconsistente entre tentativas na mesma pagina (confirmado inclusive em regras :hover simples, sem media query, sem conflito de especificidade -- nao e' bug de CSS). Se um teste de hover via automacao nao mostrar mudanca visual, NAO trate isso sozinho como prova de que o hover esta quebrado: leia o CSS-fonte (Grep/Read em "C:\\Users\\gabri\\Desktop\\tnl\\lp-escalada\\dev\\index.html") pra confirmar se a regra ":hover" existe e faz sentido antes de reportar como blocking issue.\n\nMEDIDA REAL, NAO SO' LEITURA DE CODIGO: pra qualquer julgamento sobre layout, espaco, corte de elemento ou "cabe na tela" (principalmente no mobile), NAO confie so' em getComputedStyle/CSS-fonte -- meca de verdade com getBoundingClientRect() dos elementos renderizados (inclusive dentro do iframe do simulador "Mobile", via document.querySelector('#mobile-preview-frame').contentDocument) e compare contra a altura real do viewport. Um elemento pode parecer "deveria caber" lendo o CSS e ainda assim ficar atras de uma barra fixa (sticky/fixed) na renderizacao real -- so' a medicao real do DOM renderizado prova isso.`

const CONTEXT = `Contexto: Escalada Sebrae e' um programa de empreendedorismo gamificado pra estudantes (14+ anos) e professores/educadores/multiplicadores, Ciclo 2026, Brasil. Mecanica: usuario se cadastra, completa trilhas/modulos/missoes/quizzes, ganha pontos, sobe num ranking MENSAL; os 20 melhores do mes disputam o GameShow Escalada ao vivo, com premios como smartphone e tablet anunciados a cada ciclo (o item e a quantidade de vencedores variam mes a mes, entao a copy usa linguagem hedged -- "premios como smartphone e tablet", nunca "um smartphone garantido"). IMPORTANTE: o cadastro real NAO pede nem verifica vinculo com uma instituicao de ensino especifica (so' pede idade/grau de escolaridade) -- "vinculado a uma instituicao de ensino" foi removido da copy por ser uma alegacao sem lastro no fluxo real de cadastro; nao cobre isso como requisito de elegibilidade. Professores tem trilha propria (modulos v3.5, com quizzes e artigos) e pontuam por cada estudante que vinculam e mantem engajado, premio: voucher de R$1.000/mes por ate 3 meses. Esta e' uma landing page em staging (${URL}), sendo redesenhada pra melhorar conversao, principalmente pro publico jovem (gen Z / gen Y).`

const AMBITION_BAR = `ATENCAO -- CALIBRACAO DO GATE (leia antes de responder): esta pagina ja passou por mais de dez rodadas de QA e ajustes -- a maioria PEQUENA (cor, uma frase de copy, easing de uma animacao, um espacamento). O dono do projeto revisou o resultado dessas rodadas e reclamou explicitamente que a pagina "nao mudou quase nada" apesar de todo mundo aprovar, e que os agentes estavam aprovando polimento pequeno em vez de exigir evolucao real. A partir de agora, NAO aprove (SIM) so' porque nao achou nada quebrado ou porque um ajuste pontual ja foi suficiente. Pergunte-se com rigor: nesta dimensao especifica, esta pagina hoje e' genuinamente EXCEPCIONAL -- do nivel que um designer de produto renomado, um growth lead de primeira linha, ou um adolescente exigente chamariam de "isso e' surpreendente, nunca vi isso numa LP de programa educacional" -- ou e' so' "adequada", "sem erro obvio", "profissional mas esperada"? Se for so' adequada, isso NAO e' SIM.\n\nAlem de reportar bugs/defeitos concretos (que continuam sendo motivo de NAO por si so'), voce TEM que preencher o campo "big_idea" da saida estruturada com UMA mudanca estrutural ou experiencial GRANDE especifica pra esta pagina e esta dimensao -- do tamanho de uma secao nova, um tipo de interacao novo, uma reestruturacao de fluxo, um formato novo de prova social/dado real, uma forma diferente de contar a historia -- NUNCA um ajuste de cor, uma frase, um espacamento ou um easing. Se voce genuinamente acha que a pagina ja tem esse nivel de ambicao nesta dimensao, ainda assim preencha "big_idea" com a PROXIMA fronteira (o que a levaria do "excelente" pro "inesquecivel"), e pode responder SIM. Mas se a pagina so' esta "sem defeitos", trate a FALTA dessa ambicao como parte do motivo do veredito ser NAO, com a ideia grande registrada tambem como um blocking_issue (location: "geral" ou a secao mais relevante).`

const QUESTIONS = [
  {
    key: 'converte', priority: 1,
    prompt: `Pergunta 1 (a MAIS importante -- prioridade maxima): ISSO CONVERTE?\n\n${CONTEXT}\n\n${BROWSER_TIP}\n\nAvalie ${URL} como funil de conversao pro cadastro no programa. So' responda SIM se: (a) o CTA principal ("Quero participar") e' obvio na primeira dobra tanto no desktop quanto no mobile, com o card/animacao de destaque TOTALMENTE visivel (nao cortado por header ou barra fixa -- meca de verdade, ver dica tecnica); (b) a proposta de valor (o que e', pra quem, o que se ganha) fica clara em poucos segundos sem precisar rolar muito; (c) nao ha friccao obvia -- texto confuso, CTA escondido/cortado, excesso de rolagem antes de qualquer chamada pra acao; (d) elementos de urgencia/prova social reforcam a decisao de entrar agora. Contexto real de dados: o site antigo tinha 0,2% de engajamento mobile contra 76% no desktop, e o elemento mais clicado de longe era o botao de fechar um popup intrusivo -- friccao precoce e' o maior risco de conversao aqui.\n\n${AMBITION_BAR}\n\nExemplos do tipo de "big_idea" que serve aqui (nao copie, pense no que realmente moveria o ponteiro): um formulario de cadastro embutido/simplificado direto na LP em vez de redirecionar pra outro dominio; prova social com numero real e crescente (contador de inscritos ao vivo, nao so' o rank fake); uma demonstracao interativa de uma trilha/missao real ANTES do cadastro; personalizacao do CTA por segmento (estudante vs professor) logo no primeiro clique. Coloque-se no lugar de um estudante de 14-17 anos ou de um professor chegando por um anuncio: em menos de 10 segundos, em AMBOS os formatos, voce saberia o que fazer e por que -- e o que veria te faria escolher esta LP sobre qualquer concorrente de atencao no feed? Reporte o veredito via a ferramenta de saida estruturada.`,
  },
  {
    key: 'explica', priority: 2,
    prompt: `Pergunta 2: ISSO EXPLICA?\n\n${CONTEXT}\n\n${BROWSER_TIP}\n\nAvalie se um visitante que nunca ouviu falar do Escalada entende, so' lendo ${URL}: o que e' o programa, quem pode participar (estudante 14+ vs. professor/educador/multiplicador), como se pontua (trilhas, modulos, missoes, streak), o que e' o ranking mensal, o que e' o GameShow Escalada, e qual e' o premio de cada trilha. So' responda SIM se AMBOS os publicos saem com uma explicacao completa e sem ambiguidade do que fazer e o que ganham, sem jargao nao explicado.\n\n${AMBITION_BAR}\n\nExemplos do tipo de "big_idea" que serve aqui: uma trilha de exemplo real (nao so' texto descrevendo, mas mostrando uma missao/quiz de verdade, mesmo que soh como preview); um comparador visual interativo "estudante vs professor" que a pessoa escolhe e ve so' o caminho dela; uma linha do tempo animada do "dia 1 ao GameShow" que substitui paragrafos de explicacao por uma narrativa visual; um modo "explica rapido" (30s) vs "quero saber tudo" pra visitantes com tempos de atencao diferentes.`,
  },
  {
    key: 'correto', priority: 3,
    prompt: `Pergunta 3: ISSO ESTA CORRETO?\n\n${CONTEXT}\n\nVoce tem acesso de leitura ao sistema de arquivos. Cruze CADA alegacao factual da PAGINA PRINCIPAL de ${URL} (index.html: premios, elegibilidade, mecanica de pontos, existencia da trilha do professor em modulos v3.5, ciclo/datas, etc.) contra as fontes oficiais: leia "C:\\Users\\gabri\\Desktop\\tnl\\B.O-s-Escalada\\utilitarios\\REGULAMENTO GERAL - CICLO 2026.md" e explore o repositorio "C:\\Users\\gabri\\Desktop\\tnl\\B.O-s-Escalada" (Grep/Glob a vontade) atras de qualquer coisa que contradiga o texto da LP -- e tambem atras de qualquer coisa que a LP AFIRME como requisito/processo que nao bate com o fluxo OPERACIONAL real (ex.: campos que o formulario de cadastro de verdade pede vs. o que a copy da LP sugere que e' exigido). ${BROWSER_TIP}\n\nATENCAO SOBRE O ESCOPO -- a subpagina ${URL}/faq/ busca seu conteudo em TEMPO DE EXECUCAO de um arquivo remoto (Supabase storage, export de WordPress/Elementor: "https://database.tnledu.shop/storage/v1/object/public/scripts-escalada/scripts/index-lp.html") que NAO faz parte do repositorio "lp-escalada" e nao pode ser editado por quem trabalha nesse repositorio -- e' mantido por outro sistema/time. Se voce achar erros factuais dentro de ${URL}/faq/ especificamente (nao na pagina principal), LISTE-OS em blocking_issues marcando claramente "(fora do repo lp-escalada, conteudo remoto)" no campo location, mas NAO deixe isso sozinho derrubar o veredito pra NAO -- o veredito desta pergunta deve refletir a CORRECAO DA PAGINA PRINCIPAL (index.html), que e' o que de fato pode ser corrigido aqui.\n\nSo' responda SIM se nao sobrar nenhuma alegacao sem lastro nas fontes NA PAGINA PRINCIPAL, incluindo lastro no fluxo OPERACIONAL real (nao so' no regulamento em teoria).\n\n${AMBITION_BAR}\n\nExemplos do tipo de "big_idea" que serve aqui (correcao e' sobre confianca, entao pense em transparencia estrutural, nao so' corrigir uma frase): uma secao/pagina "como sabemos que isso e' verdade" com trechos citados do regulamento oficial linkados; um indicador visual de "dado real" vs "exemplo simulado" mais forte que so' um rotulo de texto pequeno (o rank card ja tem "· exemplo", mas isso e' suficiente pra alguem que so' bate o olho?); expor a formula de pontuacao como algo auditavel/calculavel pelo proprio usuario, nao so' uma tabela estatica.`,
  },
  {
    key: 'bonito', priority: 4,
    prompt: `Pergunta 4: ISSO ESTA BONITO?\n\n${CONTEXT}\n\n${BROWSER_TIP}\n\nAvalie a qualidade visual de ${URL} como um designer senior exigente avaliaria -- tipografia, espacamento, hierarquia, paleta, consistencia, qualidade das animacoes, e se o conjunto parece artesanal e intencional ou generico/"cara de IA". Role a pagina inteira no desktop E veja no mobile (botao "Mobile").\n\n${AMBITION_BAR}\n\nExemplos do tipo de "big_idea" que serve aqui (nao "trocar uma cor" -- pense em algo que mudaria a IMPRESSAO GERAL da peca): um motivo visual assinatura que aparece em MAIS de uma secao amarrando a identidade toda (hoje a "escada" so' aparece na propria secao da escada); uma secao inteiramente nova com um tratamento visual diferente de tudo que ja existe (ex.: um "mapa" da jornada completa, um "diario" visual de progresso de um estudante fictício, uma galeria real de premios/eventos passados); parallax ou profundidade real entre camadas no scroll, nao so' fade-in; uma paleta/modo alternativo pra uma secao especifica que quebra o padrao card-em-grid que se repete demais hoje (fatos, publicos, comunidade, passos sao todos "grade de cards" -- isso ja cansou visualmente?).`,
  },
  {
    key: 'gruda_jovem', priority: 5,
    prompt: `Pergunta 5: ISSO GRUDA O JOVEM?\n\n${CONTEXT}\n\n${BROWSER_TIP}\n\nAvalie ${URL} como se voce fosse um adolescente de 13-17 anos com o celular na mao, tempo de atencao curto, decidindo em segundos se fica ou sai. Criterios: a linguagem soa genuina/direta ou corporativa/forcada? Existe pico de dopamina real (o ranking mudando de posicao com glow, o confete, urgencia, premio concreto) ou e' so' texto explicativo? O tom tenta ser "descolado" de um jeito constrangedor (cringe) ou acerta o equilibrio? A experiencia parece um joguinho/desafio ou um formulario disfarcado?\n\n${AMBITION_BAR}\n\nExemplos do tipo de "big_idea" que serve aqui (pense em mecanica de retenção/jogo real, nao so' "deixar o texto mais gente"): um preview jogavel de verdade (um mini-quiz ou desafio de 30s direto na LP, antes do cadastro, que ja da' pontos "de mentira" pro visitante sentir a mecanica); prova social com rosto/voz real de estudante (video curto, audio, ou pelo menos avatar/nome menos generico que "Estudante Escalada"); um elemento de competicao social imediato (ex.: "convide um amigo e comecem juntos", ranking entre amigos); countdown/urgencia real ligada ao ciclo mensal (nao so' "em andamento" -- quantos dias faltam pro ranking fechar de verdade?). So' responda SIM se voce, no papel desse adolescente, sentiria vontade real de continuar e se cadastrar -- nao so' entenderia a proposta.`,
  },
  {
    key: 'acessivel', priority: 6,
    prompt: `Pergunta 6: ISSO ESTA ACESSIVEL?\n\n${CONTEXT}\n\n${BROWSER_TIP} Voce tambem pode ler o HTML-fonte direto em "C:\\Users\\gabri\\Desktop\\tnl\\lp-escalada\\dev\\index.html".\n\nVerifique: contraste de cor texto/fundo em cada secao, se as animacoes respeitam "prefers-reduced-motion", se botoes/links sao elementos semanticos navegaveis por teclado, se icones decorativos tem aria-hidden e icones informativos tem alternativa textual, se o FAQ em <details>/<summary> funciona sem mouse, e se os alvos de toque no mobile tem tamanho razoavel. So' responda SIM se nao sobrar nenhuma barreira real de acessibilidade.\n\n${AMBITION_BAR}\n\nExemplos do tipo de "big_idea" que serve aqui (acessibilidade "sem barreira" e' o piso, nao o teto): um modo de leitura/narrativa alternativo pensado pra leitor de tela contar a "historia" da jornada de forma coerente (nao so' elementos individualmente acessiveis, mas a EXPERIENCIA completa fazendo sentido lida em sequencia); texto alternativo/descricao textual real da animacao do rank card pra quem usa reduced-motion ou leitor de tela (hoje eles so' veem o estado final estatico -- eles perdem a narrativa "Voce sobe ate o 1o lugar" que e' o gancho emocional principal da pagina?); um toggle de alto-contraste ou fonte maior acessivel direto na pagina, nao so' dependente de configuracao do SO.`,
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
  bigIdeas: answered.map(r => ({ key: r.key, big_idea: r.big_idea })),
  results: answered.sort((a, b) => a.priority - b.priority),
}
