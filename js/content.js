// =============================================================
// Conteúdo do DevEnglish
// Convenção: em opções de múltipla escolha, a PRIMEIRA opção é
// sempre a correta. O app embaralha na hora de mostrar.
// =============================================================

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const LEVEL_NAMES = {
  A1: "Hello World",
  A2: "Junior",
  B1: "Pleno",
  B2: "Sênior",
  C1: "Tech Lead",
  C2: "Architect",
};

export const SKILLS = {
  reading: "Leitura",
  writing: "Escrita",
  listening: "Escuta",
  speaking: "Fala",
};

export const TRACKS = [
  { id: "code", icon: "</>", name: "Code & Dev Life", desc: "Erros, Git, PRs, documentação e como falar de código" },
  { id: "slang", icon: "#", name: "Dev Slang", desc: "As gírias que todo dev gringo usa no Slack" },
  { id: "meetings", icon: "@", name: "Reuniões & Daily", desc: "Daily, calls e como pedir ajuda" },
  { id: "ai", icon: "AI", name: "IA & Dados", desc: "LLMs, modelos, RAG, evals e o vocabulário de IA" },
  { id: "speech", icon: "~", name: "Inglês falado", desc: "gonna, wanna, palavras que grudam e frases longas" },
  { id: "biz", icon: "$", name: "Negócios", desc: "E-mails, entrevista de emprego e produto" },
];

// ---------- helpers de autoria ----------
const M = (q, opts, tip, x = {}) => ({ type: "mcq", q, opts, tip, ...x });
const F = (text, opts, tip, x = {}) => ({ type: "fill", text, opts, tip, ...x });
const O = (answer, pt, tip, x = {}) => ({ type: "order", answer, pt, tip, ...x });
const L = (audio, q, opts, tip, x = {}) => ({ type: "listen", audio, q, opts, tip, ...x });
const D = (audio, tip, x = {}) => ({ type: "dict", audio, tip, ...x });
const B = (steps, q, opts, tip, x = {}) => ({ type: "buildup", steps, q, opts, tip, ...x });
const R = (kind, title, text, qs, x = {}) => ({
  type: "read", kind, title, text,
  qs: qs.map(([q, opts, tip]) => ({ q, opts, tip })),
  ...x,
});
const S = (text, pt, tip, x = {}) => ({ type: "speak", text, pt, tip, ...x });
const W = (prompt, model, tip, x = {}) => ({ type: "write", prompt, model, tip, ...x });
const P = (pairs, tip, x = {}) => ({ type: "match", pairs, tip, ...x });

const lesson = (id, track, level, title, desc, words, items) => ({
  id, track, level, title, desc,
  words: words.map(([en, pt, ex], i) => ({ id: `${id}:${i}`, en, pt, ex, level, lesson: id })),
  items: items.map((it, i) => ({ level, ...it, id: `${id}#${i}`, lesson: id, track })),
});

// =============================================================
// LIÇÕES
// =============================================================
export const LESSONS = [
  // ------------------------------------------------ CODE
  lesson("code-errors", "code", "A2", "Mensagens de erro", "Entenda o que o terminal está tentando te dizer",
    [
      ["error", "erro", "The build failed with an error."],
      ["warning", "aviso (não quebra, mas atenção)", "You can ignore this warning for now."],
      ["undefined", "indefinido (sem valor)", "The variable is undefined."],
      ["not found", "não encontrado", "Error 404: page not found."],
      ["permission denied", "permissão negada", "Permission denied. Try running it with sudo."],
      ["timeout", "tempo esgotado", "The request failed with a timeout."],
      ["missing", "faltando", "A required file is missing."],
      ["to crash", "travar / fechar sozinho", "The app crashes when I click save."],
    ],
    [
      R("terminal", "npm run build",
`$ npm run build

> my-app@1.0.0 build
> vite build

✗ Build failed in 1.2s
error: Could not resolve "./components/Header"
  from "src/App.jsx"
  File not found. Did you mean "./components/header"?`,
        [
          ["What is the problem?", ["A file could not be found", "The internet is down", "The computer is out of memory"], "'Could not resolve' + 'File not found' = o import aponta para um arquivo que não existe."],
          ["What does 'Did you mean...?' suggest?", ["The file name has a different capital letter", "The file was deleted", "You need to install a package"], "'Did you mean' = 'Você quis dizer'. A diferença é Header × header."],
        ]),
      M("'Permission denied' significa:", ["Permissão negada", "Senha incorreta", "Arquivo corrompido", "Acesso liberado"], "Deny = negar. Muito comum no Linux quando falta permissão (sudo)."),
      F("The request failed because of a ___. The server took too long to respond.", ["timeout", "warning", "merge"], "Timeout = o tempo limite estourou."),
      L("The app crashes every time I click the save button.", "When does the app crash?", ["When the user clicks save", "When the app starts", "When the user logs in"], "'Every time' = toda vez. 'Crash' = o app fecha/trava."),
      D("The variable is undefined.", "Undefined soa como 'ân-di-fáind'."),
      P([["warning", "aviso"], ["missing", "faltando"], ["timeout", "tempo esgotado"], ["not found", "não encontrado"]]),
      S("I'm getting an error when I run the tests.", "Estou recebendo um erro quando rodo os testes.", "'Getting an error' é bem mais natural que 'receiving an error'."),
      O("The build failed because a file is missing", "O build falhou porque um arquivo está faltando", "Ordem natural: sujeito + verbo + because + motivo."),
    ]),

  lesson("code-git", "code", "A2", "Git & commits", "push, pull, merge, conflitos e boas commit messages",
    [
      ["to push", "enviar (commits para o remoto)", "I pushed my changes to GitHub."],
      ["to pull", "puxar (baixar atualizações)", "Pull the latest changes before you start."],
      ["branch", "ramo / branch", "Create a new branch for this feature."],
      ["to merge", "mesclar / juntar", "We merged the branch into main."],
      ["merge conflict", "conflito de merge", "I need to fix a merge conflict."],
      ["to revert", "reverter / desfazer", "Let's revert that commit. It broke production."],
      ["commit message", "mensagem de commit", "Write a clear commit message."],
      ["up to date", "atualizado", "Your branch is up to date with main."],
    ],
    [
      R("terminal", "git status",
`$ git status
On branch feature/login
Your branch is behind 'origin/feature/login' by 2 commits,
and can be fast-forwarded.
  (use "git pull" to update your local branch)

Changes not staged for commit:
  modified:   src/auth.js`,
        [
          ["What should you do to update your branch?", ["Run git pull", "Run git revert", "Delete the branch"], "'Behind ... by 2 commits' = atrás 2 commits em relação ao remoto."],
          ["What is the state of src/auth.js?", ["It was modified but not staged", "It was deleted", "It is up to date"], "'Not staged' = ainda não foi adicionado com git add."],
        ]),
      F("Yesterday I ___ my changes to the main branch.", ["pushed", "pulled", "pushing"], "Yesterday pede passado: push → pushed."),
      O("Let's revert that commit because it broke production", "Vamos reverter aquele commit porque ele quebrou produção", "'Break' → 'broke' (passado irregular)."),
      L("Before you open a pull request, make sure your branch is up to date with main.", "What should you do before opening a pull request?", ["Update your branch with main", "Delete old branches", "Write the documentation"], "'Make sure' = garanta que / certifique-se."),
      M("Qual é a melhor commit message?", ["Fix login redirect when token expires", "fixed stuff", "changes", "asdfgh"], "Convenção: verbo no imperativo (Fix, Add, Update, Remove) + o que mudou."),
      W("Escreva uma commit message em inglês para: você corrigiu um bug em que o botão de logout não funcionava no celular.", "Fix logout button not working on mobile", "Use o imperativo: Fix, Add, Update, Remove…"),
      D("I need to fix a merge conflict."),
      S("I'll push the fix after the code review.", "Vou subir a correção depois do code review.", "'Code' soa /koʊd/ (\"côud\"), não \"códi\"."),
    ]),

  lesson("code-pr", "code", "B1", "Pull requests & code review", "LGTM, nits, request changes e como responder reviews",
    [
      ["LGTM", "Looks Good To Me = aprovado", "LGTM, ship it!"],
      ["nit", "detalhe pequeno (não bloqueia)", "Nit: rename this variable to userId."],
      ["to approve", "aprovar", "Two people approved the PR."],
      ["to request changes", "pedir alterações", "The reviewer requested changes."],
      ["to refactor", "refatorar", "We should refactor this function."],
      ["readability", "legibilidade", "This change improves readability."],
      ["edge case", "caso extremo / de borda", "What happens in this edge case?"],
      ["to address (a comment)", "resolver / tratar um comentário", "I addressed all your comments."],
    ],
    [
      R("pr", "PR #482 · Add password reset flow",
`@ana (reviewer)
Nice work! A few comments:
1. nit: "getuser" should be "getUser".
2. What happens if the email doesn't exist? We should handle that edge case.
3. This function is getting long. Could we refactor it into smaller functions?
Requesting changes for now, but it's close!

@you
Thanks! I addressed 1 and 2. For 3, can I do it in a follow-up PR?`,
        [
          ["Is comment 1 important?", ["No, it's a small detail", "Yes, it blocks the release", "It's a security issue"], "'nit' (de nitpick) = detalhe pequeno, opcional."],
          ["What does Ana want to know in comment 2?", ["What happens when the email doesn't exist", "Who wrote the code", "When the PR will be merged"], "'Handle that edge case' = tratar esse caso extremo."],
          ["What does 'follow-up PR' mean?", ["A separate PR later", "A PR that someone else does", "Closing the PR"], "'Follow-up' = continuação, depois."],
        ]),
      M("O revisor escreveu 'LGTM 🚀'. Isso significa:", ["Está bom, pode aprovar", "Tem um bug grave", "Falta teste", "Refaça tudo"], "LGTM = Looks Good To Me."),
      F("I ___ all your comments. Can you take another look?", ["addressed", "approved", "merged"], "'Address a comment' = resolver um comentário. Muito usado em code review."),
      L("Overall it looks good, but please add a test for the edge case before we merge.", "What does the reviewer want before merging?", ["A test for the edge case", "A new design", "Better variable names"], "'Overall' = no geral."),
      O("Could you take another look at my pull request", "Você poderia dar outra olhada no meu pull request?", "'Take a look' = dar uma olhada."),
      W("Responda em inglês a um comentário de code review: o revisor pediu para renomear uma variável. Diga que concorda e que já fez a alteração.", "Good catch, thanks! I renamed it and pushed the change.", "'Good catch' = boa observação."),
      S("Good catch! I'll fix it and push again.", "Boa observação! Vou corrigir e subir de novo."),
      D("This change improves readability."),
    ]),

  lesson("code-docs", "code", "B1", "Lendo documentação", "deprecated, required, default, throws e breaking changes",
    [
      ["deprecated", "obsoleto (vai ser removido)", "This method is deprecated."],
      ["parameter", "parâmetro", "The function takes two parameters."],
      ["required", "obrigatório", "The ID is required."],
      ["optional", "opcional", "The second parameter is optional."],
      ["default value", "valor padrão", "The default value is true."],
      ["to return", "retornar", "It returns a list of users."],
      ["to throw (an error)", "lançar (um erro)", "It throws an error if the ID is invalid."],
      ["breaking change", "mudança que quebra compatibilidade", "Version 3 has a breaking change."],
    ],
    [
      R("doc", "fetchUser(id, options?)",
`fetchUser(id, options?)

Returns a Promise that resolves to a User object.

Parameters
  id       string   Required. The user's unique ID.
  options  object   Optional.
    cache  boolean  Default: true. Set to false to always fetch fresh data.

Throws NotFoundError if the user does not exist.

⚠ Deprecated in v3.0. Use getUser() instead.`,
        [
          ["Which parameter is required?", ["id", "options", "cache"], "'Required' = obrigatório."],
          ["What happens if the user does not exist?", ["The function throws an error", "It returns an empty object", "It returns null"], "'Throws' = lança (um erro/exceção)."],
          ["Should you use fetchUser in new code?", ["No, it's deprecated", "Yes, it's the newest version", "Only with cache: false"], "'Deprecated' = obsoleto, será removido no futuro."],
        ]),
      M("'Breaking change' é:", ["Uma mudança que quebra compatibilidade com versões antigas", "Uma correção de bug", "Uma pausa no trabalho", "Um teste que falhou"]),
      F("This parameter is ___. If you don't pass it, the default value is used.", ["optional", "required", "deprecated"]),
      L("In version two, the config file is no longer required. If it's missing, the default values are used.", "What happens if the config file is missing?", ["Default values are used", "The app crashes", "You must create it"], "'No longer' = não mais."),
      P([["returns", "retorna"], ["required", "obrigatório"], ["deprecated", "obsoleto"], ["default", "padrão"]]),
      D("This method is deprecated and will be removed in the next version."),
      S("According to the docs, this parameter is optional.", "De acordo com a documentação, esse parâmetro é opcional.", "'Docs' = documentação (informal). 'According to' = de acordo com."),
    ]),

  lesson("code-talk", "code", "A2", "Falando sobre código", "Pronúncia dos termos que todo brasileiro erra",
    [
      ["array", "array — fala-se \"arrêi\"", "Loop through the array."],
      ["queue", "fila — fala-se \"kiú\" (igual à letra Q)", "Add the job to the queue."],
      ["cache", "cache — fala-se \"késh\" (igual a cash)", "Clear the cache and try again."],
      ["null", "nulo — fala-se \"nâl\"", "The value is null."],
      ["width", "largura — fala-se \"uídth\"", "Set the width to 100%."],
      ["height", "altura — fala-se \"háit\"", "The height is too small."],
      ["to loop through", "percorrer (um loop)", "This function loops through the list."],
      ["argument", "argumento (valor passado à função)", "Pass the ID as an argument."],
    ],
    [
      M("Ouça. Como se pronuncia 'queue' (fila)?", ["\"kiú\"", "\"kuêuê\"", "\"quê\""], "Queue = /kjuː/, igual à letra Q.", { audio: "queue" }),
      M("Como se fala 'cache'?", ["\"késh\" (igual a cash)", "\"cá-tchê\"", "\"cá-quê\""], "Cache soa igual a 'cash' (dinheiro).", { audio: "cache" }),
      L("This function loops through the array and returns the first null value.", "What does the function return?", ["The first null value", "The array length", "Nothing"], "'Loops through' = percorre."),
      F("This function ___ a boolean: true or false.", ["returns", "calls", "loops"]),
      S("The width and height of the image are stored in the cache.", "A largura e a altura da imagem estão guardadas no cache.", "Width ≈ \"uídth\", height ≈ \"háit\", cache ≈ \"késh\"."),
      O("Pass the user ID as an argument to the function", "Passe o ID do usuário como argumento para a função"),
      D("Add the new item to the end of the queue."),
      S("Run it with sudo and check the logs.", "Rode com sudo e confira os logs.", "Sudo costuma ser \"sú-du\". Logs = \"lógz\"."),
    ]),

  // ------------------------------------------------ SLANG
  lesson("slang-daily", "slang", "B1", "Gírias do dia a dia", "heads-up, blocker, ETA, EOD, OOO, ping me…",
    [
      ["heads-up", "aviso prévio / \"fica ligado\"", "Heads-up: the API is down."],
      ["blocker", "algo que te impede de avançar", "This bug is a blocker for the release."],
      ["ETA", "previsão (Estimated Time of Arrival)", "What's the ETA on the fix?"],
      ["EOD", "fim do dia (End Of Day)", "I'll send it by EOD."],
      ["OOO", "fora do escritório (Out Of Office)", "I'm OOO tomorrow."],
      ["WIP", "em andamento (Work In Progress)", "Don't review it yet, it's a WIP."],
      ["to ping (someone)", "chamar alguém (mensagem rápida)", "Ping me when you're done."],
      ["ship it", "lança! / pode colocar no ar", "Tests are green. Ship it!"],
    ],
    [
      R("slack", "#team-backend",
`Lucas  9:12 AM
Heads-up: staging is down, I'm looking into it 👀

Maria  9:15 AM
Thanks! Is it a blocker for the release?

Lucas  9:16 AM
Kinda. ETA ~30 min. I'll ping you when it's back up.

Maria  9:17 AM
👍 I'm OOO this afternoon, so if it's not fixed by EOD, ping Ravi.`,
        [
          ["What does 'Heads-up' mean here?", ["A warning / notice", "A question", "A joke"], "'Heads-up' = aviso prévio."],
          ["When will Lucas probably fix it?", ["In about 30 minutes", "Tomorrow", "He doesn't know"], "ETA = previsão."],
          ["Why should people ping Ravi?", ["Maria will be out of office", "Ravi broke staging", "Ravi is the boss"], "OOO = Out Of Office. EOD = End Of Day."],
        ]),
      P([["ETA", "previsão"], ["EOD", "fim do dia"], ["OOO", "fora do escritório"], ["WIP", "em andamento"]]),
      M("'This PR is a WIP' significa:", ["Ainda está em andamento, não revise ainda", "Está pronto para produção", "Tem um bug crítico", "Foi cancelado"]),
      F("I can't continue. This bug is a ___ for me.", ["blocker", "heads-up", "ship"], "Blocker = algo que trava seu trabalho."),
      L("Tests are green, the reviewer approved it, so let's ship it!", "What does the speaker want to do?", ["Release the code", "Write more tests", "Cancel the PR"], "'Green' = testes passando. 'Ship it' = colocar no ar."),
      S("Just a heads-up: I'll be out of office tomorrow.", "Só um aviso: estarei fora amanhã."),
      D("Ping me when it's back up.", "'Back up' = funcionando de novo."),
    ]),

  lesson("slang-veteran", "slang", "B2", "Gírias de veterano", "yak shaving, bikeshedding, tech debt, bus factor…",
    [
      ["yak shaving", "cadeia de tarefas pequenas que te afasta do objetivo", "Two hours of yak shaving just to update one package."],
      ["bikeshedding", "discutir demais algo trivial", "Let's stop bikeshedding about the button color."],
      ["rubber duck debugging", "explicar o código em voz alta para achar o bug", "Rubber duck debugging works surprisingly well."],
      ["footgun", "recurso fácil de usar errado (dar um tiro no pé)", "This config option is a footgun."],
      ["tech debt", "dívida técnica", "We have a lot of tech debt in this module."],
      ["spaghetti code", "código bagunçado e emaranhado", "The old code is pure spaghetti."],
      ["happy path", "cenário em que tudo dá certo", "We only tested the happy path."],
      ["bus factor", "quantas pessoas, se sumissem, travariam o projeto", "The bus factor on this project is one."],
    ],
    [
      M("'I spent the morning yak shaving.' O que aconteceu?", ["Fiquei resolvendo uma cadeia de tarefas pequenas longe do objetivo", "Terminei tudo rápido", "Apaguei o repositório", "Fiz pair programming"], "Yak shaving: para fazer A, precisa de B, que precisa de C… e você termina fazendo algo nada a ver.", { tipEn: "Yak shaving: a chain of small tasks you must do before the real one." }),
      F("We spent an hour discussing the button color. Classic ___.", ["bikeshedding", "dogfooding", "refactoring"], "Bikeshedding: discutir demais detalhes triviais.", { tipEn: "Bikeshedding: spending too much time on trivial details." }),
      L("Well, it works on my machine, so it's probably something in your environment.", "What is the speaker suggesting?", ["The problem is in the other person's setup", "The code is broken", "They need a new computer"], "'It works on my machine' é a frase clássica (e meio irônica) de dev.", { tipEn: "A classic (and ironic) developer excuse." }),
      R("slack", "#eng-leads",
`Priya
Honest question: why does every change in the billing module take a week?

Tom
Tech debt. It's spaghetti code from 2019, and the bus factor is 1 (only Carl understands it).

Priya
OK. Let's plan a refactor next quarter. Until then, nobody touches it on a Friday 😅`,
        [
          ["Why are changes slow in the billing module?", ["The code is old and messy", "The team is too big", "The servers are slow"], "Tech debt + spaghetti code = código antigo e bagunçado."],
          ["What does 'the bus factor is 1' mean?", ["Only one person knows the code", "There is one bug", "They have one server"], "Se o Carl sumir, ninguém entende o módulo."],
        ]),
      P([["footgun", "fácil de usar errado"], ["dogfooding", "usar o próprio produto"], ["happy path", "cenário sem erros"], ["rubber duck", "explicar em voz alta"]]),
      S("We need to pay down some tech debt before adding new features.", "Precisamos reduzir a dívida técnica antes de adicionar features novas.", "'Pay down debt' = reduzir/quitar a dívida."),
      W("Explique em inglês (1-2 frases) para um colega por que vocês deveriam refatorar um módulo antigo antes de adicionar uma feature.", "This module has a lot of tech debt, so every change takes longer and breaks things. If we refactor it first, the new feature will be faster and safer to build."),
    ]),

  // ------------------------------------------------ MEETINGS
  lesson("meet-daily", "meetings", "A2", "Daily standup", "Ontem, hoje e bloqueios: sua atualização em 30 segundos",
    [
      ["standup", "daily (reunião diária rápida)", "Our standup is at 10."],
      ["update", "atualização / status", "Quick update from me."],
      ["to work on", "trabalhar em", "I'm working on the login page."],
      ["blocked", "bloqueado", "I'm blocked by the API."],
      ["almost done", "quase pronto", "I'm almost done with the tests."],
      ["still", "ainda", "I'm still waiting for access."],
      ["to pair (with someone)", "fazer pair programming", "I paired with Leo yesterday."],
      ["to wrap up", "finalizar", "Let's wrap it up by lunch."],
    ],
    [
      B(["I'm still working", "I'm still working on the login bug", "I'm still working on the login bug, but I'm almost done", "I'm still working on the login bug, but I'm almost done, and I should open a PR today"], "When will the speaker open a PR?", ["Today", "Tomorrow", "Next week"], "'Still' = ainda. 'Almost done' = quase pronto."),
      L("Yesterday I finished the payment page. Today I'm going to write tests for it. No blockers.", "What will the speaker do today?", ["Write tests", "Finish the payment page", "Fix a blocker"]),
      F("Today I'm going to ___ on the search feature.", ["work", "worked", "working"], "Depois de 'going to' vem o verbo na forma base."),
      O("I'm blocked by the API so I need help from the backend team", "Estou bloqueado pela API, então preciso de ajuda do time de backend"),
      S("Yesterday I fixed two bugs. Today I'm going to review Ana's PR. No blockers.", "Ontem corrigi dois bugs. Hoje vou revisar o PR da Ana. Sem bloqueios."),
      W("Escreva sua atualização de daily em inglês: ontem você trabalhou na tela de perfil, hoje vai corrigir os testes que falharam e está bloqueado esperando acesso ao banco de dados.", "Yesterday I worked on the profile screen. Today I'm going to fix the failing tests. I'm blocked because I'm still waiting for database access."),
      D("I'm almost done with the new endpoint."),
      L("Quick update from me: I paired with Leo on the cache issue, and we found the cause. We should wrap it up by lunch.", "What did the speaker do?", ["Worked with Leo on a problem", "Took the day off", "Deployed to production"], "'Paired with' = fez pair programming com. 'Wrap it up' = finalizar.", { level: "B1" }),
    ]),

  lesson("meet-calls", "meetings", "A2", "Frases de call", "Mudo, compartilhar tela, conexão ruim e \"pode repetir?\"",
    [
      ["you're on mute", "você está no mudo", "Sorry, you're on mute."],
      ["can you hear me?", "você me ouve?", "Can you hear me OK?"],
      ["to share your screen", "compartilhar a tela", "Can you share your screen?"],
      ["go ahead", "pode falar / vá em frente", "Sorry, go ahead."],
      ["you're breaking up", "seu áudio está cortando", "You're breaking up a little."],
      ["could you repeat that?", "pode repetir?", "Sorry, could you repeat that?"],
      ["I'll get back to you", "te dou um retorno", "I'll get back to you tomorrow."],
      ["let's take this offline", "vamos falar disso depois, fora da reunião", "Good point. Let's take this offline."],
    ],
    [
      M("Alguém está falando e ninguém escuta. O que você diz?", ["You're on mute!", "You're offline!", "You're broken!", "Turn on the camera!"], "'On mute' = no mudo."),
      L("Sorry, you're breaking up. Could you repeat that?", "What is the problem?", ["The connection is bad", "The person is angry", "The meeting is over"], "'Breaking up' (em call) = áudio cortando."),
      F("Can you ___ your screen so we can see the error?", ["share", "show up", "send"]),
      M("'Let's take this offline' numa reunião significa:", ["Vamos conversar sobre isso depois, fora desta reunião", "Vamos desligar a internet", "Vamos cancelar o projeto", "Vamos trabalhar offline"]),
      S("Sorry, could you say that again a bit more slowly?", "Desculpe, você poderia repetir um pouco mais devagar?", "Essa frase salva vidas. Use sem vergonha!"),
      P([["go ahead", "pode falar"], ["I'll get back to you", "te dou um retorno"], ["on mute", "no mudo"], ["breaking up", "cortando"]]),
      O("I don't know yet but I'll get back to you by Friday", "Ainda não sei, mas te dou um retorno até sexta"),
      D("Can everyone see my screen?"),
    ]),

  lesson("meet-help", "meetings", "B1", "Pedir ajuda e explicar bugs", "Steps to reproduce, expected × actual e como pedir uma mão",
    [
      ["to reproduce (a bug)", "reproduzir (fazer o bug acontecer de novo)", "I can't reproduce it on my machine."],
      ["steps to reproduce", "passos para reproduzir", "Please add steps to reproduce."],
      ["expected behavior", "comportamento esperado", "The expected behavior is a success message."],
      ["actual behavior", "comportamento real (o que acontece)", "The actual behavior is a blank page."],
      ["workaround", "solução provisória / contorno", "Is there a workaround for now?"],
      ["root cause", "causa raiz", "We found the root cause."],
      ["it seems like", "parece que", "It seems like the cache is the problem."],
      ["to take a look", "dar uma olhada", "Could you take a look?"],
    ],
    [
      R("issue", "Issue #231 · Dark mode resets after refresh",
`Steps to reproduce:
1. Go to Settings
2. Turn on dark mode
3. Refresh the page

Expected behavior: Dark mode stays on.
Actual behavior: The page goes back to light mode.

Workaround: Turning it on again works until the next refresh.`,
        [
          ["What is the bug?", ["Dark mode doesn't stay on after a refresh", "The settings page doesn't open", "The app is too dark"], "Expected × actual: esperado × o que realmente acontece."],
          ["What is the workaround?", ["Turning dark mode on again", "Clearing the cache", "There is none"], "Workaround = solução provisória."],
        ]),
      F("I can't ___ the bug on my machine. Can you send me the steps?", ["reproduce", "repeat", "report"], "Reproduce a bug = fazer o bug acontecer de novo."),
      L("Could you take a look at this when you have a minute? It seems like the API returns an empty list, but only in production.", "When does the problem happen?", ["Only in production", "Only on the speaker's machine", "Every time"], "'When you have a minute' = quando tiver um tempinho."),
      O("We found the root cause and the fix is already in review", "Encontramos a causa raiz e a correção já está em revisão"),
      W("Peça ajuda em inglês a um colega sênior: o deploy está falhando só em produção e você não entende o motivo.", "Hey, could you take a look at something when you have a minute? The deploy keeps failing in production, but it works fine in staging, and I'm not sure why."),
      S("It seems like the problem only happens when the user is logged out.", "Parece que o problema só acontece quando o usuário está deslogado."),
      D("The expected behavior is different from the actual behavior."),
    ]),

  // ------------------------------------------------ AI
  lesson("ai-basics", "ai", "B1", "Fundamentos de IA", "model, training, inference, token, hallucination…",
    [
      ["model", "modelo", "We trained a new model."],
      ["training data", "dados de treinamento", "The training data was too small."],
      ["prompt", "instrução / pergunta para a IA", "Write a clear prompt."],
      ["token", "pedaço de texto que o modelo processa", "This prompt has 500 tokens."],
      ["inference", "inferência (o modelo gerando a resposta)", "Inference is fast on this GPU."],
      ["to hallucinate", "alucinar (inventar algo com confiança)", "The model hallucinated a fake API."],
      ["accuracy", "precisão / taxa de acerto", "The accuracy is 92%."],
      ["bias", "viés", "We need to reduce bias in the data."],
      ["fine-tuning", "ajuste fino de um modelo", "Fine-tuning improved the results."],
    ],
    [
      R("doc", "What is an LLM?",
`A large language model (LLM) is trained on huge amounts of text.
During training, it learns patterns in language. Later, during
inference, it uses those patterns to predict the next token.

LLMs are powerful, but they can "hallucinate": they sometimes
generate answers that sound correct but are false. That's why
you should always check important facts.`,
        [
          ["When does an LLM learn patterns?", ["During training", "During inference", "When you check facts"]],
          ["What is a 'hallucination'?", ["A confident but false answer", "A slow answer", "A very long answer"], "'Sound correct but are false' = parecem certas, mas são falsas."],
        ]),
      M("'Inference' em IA é:", ["Quando o modelo já treinado gera uma resposta", "Quando o modelo está sendo treinado", "Coletar dados", "Apagar o modelo"]),
      F("The model has high ___: it gets 95% of the answers right.", ["accuracy", "bias", "latency"]),
      L("If your training data is biased, your model will probably be biased too.", "What is the main idea?", ["Bad data creates a biased model", "Bigger models are always better", "Training is very expensive"], "'Biased' = enviesado."),
      P([["prompt", "instrução para a IA"], ["token", "pedaço de texto"], ["dataset", "conjunto de dados"], ["fine-tuning", "ajuste fino"]]),
      S("We fine-tuned the model on our own data.", "Fizemos fine-tuning do modelo com nossos próprios dados."),
      D("Always check the answer, because the model can hallucinate."),
    ]),

  lesson("ai-work", "ai", "B2", "IA no trabalho", "RAG, embeddings, context window, evals, rate limit",
    [
      ["context window", "janela de contexto (quanto texto o modelo lê de uma vez)", "The file doesn't fit in the context window."],
      ["latency", "latência (tempo de resposta)", "RAG adds some latency."],
      ["embeddings", "vetores que representam o significado do texto", "We store embeddings in a vector database."],
      ["RAG", "buscar documentos e colocar no prompt (Retrieval-Augmented Generation)", "Let's add RAG to the chatbot."],
      ["agent", "IA que usa ferramentas e executa várias etapas", "The agent opened a PR by itself."],
      ["evals", "avaliações sistemáticas de qualidade", "Let's run the evals before we ship."],
      ["guardrails", "proteções / limites de comportamento", "Add guardrails to keep it on topic."],
      ["rate limit", "limite de requisições", "We hit the rate limit."],
    ],
    [
      R("slack", "#ai-team",
`Dev
The chatbot keeps giving outdated answers about our pricing.

Lead
It's not using our docs at all. Let's add RAG: we turn the docs into embeddings, retrieve the most relevant chunks and put them in the context window.

Dev
Makes sense. What about latency?

Lead
It'll add maybe 200 ms. Fine for now. But let's set up evals before we ship, so we can measure if it actually improves.`,
        [
          ["Why does the chatbot give outdated answers?", ["It doesn't use the company docs", "The model is too small", "The internet is slow"]],
          ["Why does the lead want evals?", ["To measure if the change helps", "To reduce latency", "To train a new model"], "Evals = avaliações sistemáticas de qualidade."],
        ]),
      F("We hit the API ___ limit, so some requests are failing with error 429.", ["rate", "context", "token"], "Erro 429 = Too Many Requests.", { tipEn: "HTTP 429 means Too Many Requests." }),
      L("The context window is big enough for the whole file, but the latency gets worse with long prompts.", "What is the trade-off?", ["Long prompts make responses slower", "The file is too big", "The model is too expensive"]),
      M("Um 'AI agent' é:", ["Uma IA que usa ferramentas e executa várias etapas para cumprir uma tarefa", "Um funcionário que vende IA", "Um tipo de banco de dados", "Um antivírus"]),
      S("Let's set up some evals before we ship this to production.", "Vamos montar umas avaliações antes de colocar isso em produção."),
      W("Explique em inglês (1-2 frases) por que adicionar guardrails a um chatbot de atendimento.", "Guardrails help the chatbot stay on topic and avoid unsafe or wrong answers. That way, customers get reliable help and we protect the company."),
      D("The embeddings are stored in a vector database."),
    ]),

  // ------------------------------------------------ SPEECH
  lesson("speech-reductions", "speech", "A2", "gonna, wanna, gotta", "Como 'going to' vira 'gonna' na fala real",
    [
      ["gonna", "= going to (vou)", "I'm gonna deploy it later."],
      ["wanna", "= want to (quero)", "Do you wanna pair on this?"],
      ["gotta", "= have got to (tenho que)", "I gotta go."],
      ["lemme", "= let me (deixa eu)", "Lemme check."],
      ["kinda", "= kind of (meio que)", "It's kinda slow."],
      ["dunno", "= don't know (não sei)", "I dunno why it failed."],
      ["gimme", "= give me (me dá)", "Gimme a sec."],
    ],
    [
      L("I'm gonna deploy it after lunch.", "O que 'gonna' significa?", ["going to (vou)", "want to (quero)", "got to (tenho que)"], "Na fala rápida, 'going to' vira 'gonna'."),
      L("Do you wanna grab a coffee before the meeting?", "What is the person asking?", ["If you want coffee", "If you have a meeting", "If you finished the work"], "'Grab a coffee' = tomar um café."),
      L("Sorry, I gotta go. I've got another call.", "Why does the person leave?", ["They have another call", "They are tired", "The meeting is over"], "'Gotta' = have got to = tenho que."),
      P([["gonna", "going to"], ["wanna", "want to"], ["gotta", "have got to"], ["lemme", "let me"]]),
      D("Lemme check and I'll get back to you.", "'Lemme' = let me. Pode escrever de qualquer jeito."),
      L("I dunno, it's kinda weird. It worked yesterday.", "How does the speaker feel?", ["Confused", "Happy", "Angry"], "'Dunno' = don't know. 'Kinda' = meio que."),
      S("I'm gonna check the logs. Gimme a sec.", "Vou checar os logs. Me dá um segundo."),
    ]),

  lesson("speech-linking", "speech", "B1", "Palavras que grudam", "whaddya, didja, check it out, set it up",
    [
      ["whaddya", "= what do you", "Whaddya think?"],
      ["didja", "= did you", "Didja see the error?"],
      ["whatcha", "= what are you", "Whatcha working on?"],
      ["check it out", "dá uma olhada (soa \"che-ki-dáut\")", "Check it out and let me know."],
      ["set it up", "configurar (soa \"sé-ri-dâp\")", "Can you set it up for me?"],
      ["got it", "entendi (soa \"gá-rit\")", "Got it, thanks!"],
      ["to roll back", "voltar para a versão anterior", "We rolled it back."],
    ],
    [
      L("Whaddya think about the new design?", "What is the question?", ["What do you think about the new design?", "Where is the new design?", "Who made the new design?"], "'What do you' → 'whaddya' na fala rápida."),
      L("Didja push the changes?", "What did you hear?", ["Did you push the changes?", "Do you push the changes?", "Can you push the changes?"], "'Did you' → 'didja'."),
      D("Check it out and let me know.", "Soa como \"che-ki-dáut\": as palavras se juntam."),
      D("Can you set it up on my laptop?", "'Set it up' soa como \"sé-ri-dâp\"."),
      L("Whatcha working on today?", "What does the person want to know?", ["What you are working on", "Where you are working", "When you start working"], "'What are you' → 'whatcha'."),
      B(["I set it up", "I set it up on the server", "I set it up on the server, but it didn't work", "I set it up on the server, but it didn't work, so I rolled it back"], "What happened in the end?", ["The speaker rolled it back", "It worked perfectly", "The server crashed"], "'Rolled it back' = voltou para a versão anterior."),
      S("Got it. I'll check it out after lunch.", "Entendi. Vou dar uma olhada depois do almoço."),
    ]),

  lesson("speech-long", "speech", "B1", "Frases longas", "Treine segurar frases grandes, bloco por bloco",
    [
      ["environment variable", "variável de ambiente", "A missing environment variable broke the deploy."],
      ["otherwise", "caso contrário", "Do it now, otherwise it'll be late."],
      ["to migrate", "migrar", "We need to migrate the database."],
      ["to shut down", "desligar", "The old server will be shut down."],
      ["overloaded", "sobrecarregado", "The service is overloaded."],
      ["at the same time", "ao mesmo tempo", "Many users log in at the same time."],
    ],
    [
      B(["The deploy failed", "The deploy failed last night", "The deploy failed last night because of a missing environment variable", "The deploy failed last night because of a missing environment variable on the staging server"], "Why did the deploy fail?", ["A missing environment variable", "A network error", "A bug in the code"]),
      B(["We need to migrate", "We need to migrate the database", "We need to migrate the database before the end of the month", "We need to migrate the database before the end of the month, otherwise the old server will be shut down"], "What happens if they don't migrate in time?", ["The old server will be shut down", "They will lose all their data", "Nothing"], "'Otherwise' = caso contrário."),
      B(["I talked to the client", "I talked to the client this morning", "I talked to the client this morning, and they want the new dashboard", "I talked to the client this morning, and they want the new dashboard ready by Friday, if possible"], "When does the client want the dashboard?", ["By Friday", "This morning", "Next month"]),
      L("So the main issue is that when a lot of users log in at the same time, the authentication service gets overloaded and starts returning errors.", "When does the problem happen?", ["When many users log in at once", "When the server restarts", "When a user changes the password"], "'Overloaded' = sobrecarregado."),
      D("We need to migrate the database before the end of the month."),
      S("The deploy failed last night because of a missing environment variable.", "O deploy falhou ontem à noite por causa de uma variável de ambiente faltando.", "Divida em blocos: The deploy failed / last night / because of / a missing environment variable."),
    ]),

  // ------------------------------------------------ BUSINESS
  lesson("biz-email", "biz", "B1", "E-mails profissionais", "Follow-up, anexos, más notícias com educação",
    [
      ["to follow up", "retomar / cobrar com educação", "I'm following up on my last email."],
      ["please find attached", "segue em anexo", "Please find attached the report."],
      ["as discussed", "conforme conversamos", "As discussed, here are the next steps."],
      ["let me know", "me avise", "Let me know if you have questions."],
      ["I'm afraid", "infelizmente (educado)", "I'm afraid we can't do it this week."],
      ["to reach out", "entrar em contato", "Thanks for reaching out."],
      ["to look forward to", "aguardar ansiosamente", "I look forward to hearing from you."],
      ["by (Friday)", "até (sexta)", "Can you send it by Friday?"],
    ],
    [
      R("email", "Re: Project timeline",
`Hi Daniel,

I'm just following up on my last email about the project timeline.
As discussed on Monday, we need the API documentation before we
can start the integration.

Please find attached the updated contract. Could you sign it and
send it back by Thursday?

Let me know if you have any questions.

Best regards,
Julia`,
        [
          ["Why is Julia writing?", ["To follow up on a previous email", "To cancel the project", "To introduce herself"], "'Following up' = retomando um assunto."],
          ["What does Julia ask Daniel to do?", ["Sign the contract and send it back", "Write the API documentation", "Call her on Monday"], "'Send it back by Thursday' = devolver até quinta."],
        ]),
      M("Qual é a forma mais profissional?", ["Could you send me the report by Friday?", "Send me the report now.", "I want the report.", "Report please!!!"], "'Could you…?' é educado e direto."),
      F("I'm ___ we can't meet the deadline this week.", ["afraid", "scared", "worried"], "'I'm afraid (that)…' = infelizmente… Forma educada de dar má notícia."),
      O("I'm just following up on my last email", "Só estou retomando meu último e-mail"),
      W("Escreva um e-mail curto em inglês para um cliente avisando que a entrega vai atrasar 2 dias por causa de um bug e que você vai mandar uma atualização amanhã.", "Hi Sarah,\n\nI'm afraid the delivery will be two days late because we found a bug during testing. We're already working on the fix, and I'll send you an update tomorrow.\n\nBest regards,\n[Your name]"),
      L("Thanks for reaching out. I'll check with the team and get back to you by the end of the week.", "When will the person reply?", ["By the end of the week", "Tomorrow morning", "Never"]),
      S("Thanks for reaching out. I'll get back to you by Friday.", "Obrigado pelo contato. Te retorno até sexta."),
    ]),

  lesson("biz-interview", "biz", "B1", "Entrevista de emprego", "Se apresentar, contar desafios e fazer perguntas",
    [
      ["tell me about yourself", "fale sobre você", "So, tell me about yourself."],
      ["strength", "ponto forte", "My main strength is problem-solving."],
      ["weakness", "ponto fraco", "My weakness is public speaking."],
      ["to lead (led)", "liderar (liderei)", "I led a team of four developers."],
      ["challenge", "desafio", "What was your biggest challenge?"],
      ["role", "cargo / função", "What does a typical day look like in this role?"],
      ["salary expectations", "pretensão salarial", "What are your salary expectations?"],
      ["to grow", "crescer", "I want to grow as an engineer."],
    ],
    [
      L("So, tell me a little bit about yourself and your experience.", "What does the interviewer want?", ["A short introduction about you", "Your salary expectations", "Your address"]),
      O("I have three years of experience as a frontend developer", "Tenho três anos de experiência como desenvolvedor frontend"),
      F("I ___ a team of four developers on my last project.", ["led", "leaded", "lead"], "Lead → led (passado irregular). Pronuncia-se \"léd\"."),
      M("Qual frase está correta?", ["I have worked with React for three years.", "I work with React since three years.", "I am working with React since three years ago.", "I have three years working React."], "Algo que começou no passado e continua: present perfect + for/since."),
      S("I'm a backend developer with three years of experience, mostly with Node and PostgreSQL.", "Sou desenvolvedor backend com três anos de experiência, principalmente com Node e PostgreSQL."),
      W("Responda em inglês: 'What was a big challenge in your last project and how did you solve it?' (2-3 frases)", "Our app was very slow because of too many database queries. I found the problem with a profiler, added caching and optimized the queries. In the end, the page load time dropped by 60%."),
      L("That sounds great. Do you have any questions for us?", "What is the interviewer asking?", ["If you want to ask something", "If you have experience", "If you can start tomorrow"], "Tenha 1-2 perguntas prontas! Ex.: 'What does a typical day look like in this role?'"),
      D("I'm looking for a role where I can grow and learn from senior engineers.", "", { level: "B2" }),
    ]),

  lesson("biz-product", "biz", "B2", "Produto & métricas", "stakeholders, scope, trade-offs, MVP, churn",
    [
      ["stakeholder", "parte interessada", "The stakeholders want it in Q1."],
      ["roadmap", "planejamento do produto", "It's on the roadmap for next quarter."],
      ["scope", "escopo", "The scope is too big."],
      ["trade-off", "troca / meio-termo (ganha algo, perde algo)", "It's a trade-off between speed and quality."],
      ["deadline", "prazo", "The deadline is next Friday."],
      ["churn", "cancelamento de clientes", "Churn went up last month."],
      ["MVP", "produto mínimo viável", "Let's ship an MVP first."],
      ["to push back", "discordar / resistir (com argumento)", "Engineering pushed back on the deadline."],
    ],
    [
      R("doc", "Product sync — notes",
`• Stakeholders want the new reports feature in Q1.
• Engineering pushed back: the scope is too big for the deadline.
• Trade-off agreed: ship an MVP with basic reports in Q1,
  advanced filters in Q2.
• Priority #1 is still reducing churn: customers are leaving
  because onboarding is confusing.`,
        [
          ["Why did engineering push back?", ["The scope was too big for the deadline", "They didn't like the feature", "The stakeholders left"], "'Push back' = discordar com argumento."],
          ["What is the main priority?", ["Reducing churn", "Advanced filters", "Hiring"], "Churn = clientes cancelando."],
        ], { tipEn: "'Push back' = to disagree with or resist a request." }),
      F("We can't add more features without moving the ___. The scope is already too big.", ["deadline", "stakeholder", "churn"]),
      L("It's a trade-off: if we ship faster, we'll have less time for testing.", "What is the trade-off?", ["Speed versus testing time", "Price versus quality", "Features versus design"]),
      P([["stakeholder", "parte interessada"], ["roadmap", "planejamento"], ["scope", "escopo"], ["churn", "cancelamentos"]]),
      S("I'd like to push back a little: the scope is too big for this deadline.", "Queria discordar um pouco: o escopo está grande demais para esse prazo.", "Discordar com educação: 'I'd like to push back a little', 'I see your point, but…'"),
      W("Em inglês, sugira a um gerente de produto lançar um MVP primeiro em vez da feature completa, explicando o motivo (1-2 frases).", "What if we ship an MVP first with the core features? That way we can get feedback from real users sooner and avoid building things nobody needs."),
    ]),
];

// ---------- índices ----------
export const ITEMS = LESSONS.flatMap((l) => l.items);
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const WORDS = LESSONS.flatMap((l) => l.words);
export const WORD_BY_ID = Object.fromEntries(WORDS.map((w) => [w.id, w]));
export const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));

// Qual habilidade cada tipo de exercício treina
export const SKILL_OF_TYPE = {
  listen: "listening", dict: "listening", buildup: "listening",
  read: "reading", mcq: "reading", fill: "reading", match: "reading",
  order: "writing", write: "writing",
  speak: "speaking",
};
