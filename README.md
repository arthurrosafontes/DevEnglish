# DevEnglish

PWA para aprender inglês com foco em desenvolvimento de software: erros e terminal, Git, code review, documentação, gírias de dev, daily e calls, IA, inglês falado (gonna/wanna, frases longas) e negócios.

**100% grátis e offline.** A IA (Gemini) é opcional e só é usada para avaliar sua fala e corrigir textos.

## O que tem na v1

- **3 missões diárias de ~5 min:** Ouvido afiado (escuta), Leitura de dev (leitura e escrita) e Vocabulário & fala (flashcards + pronúncia)
- **Ofensiva (streak), XP e níveis**, com bônus ao completar as 3 missões
- **6 trilhas e 18 lições** com 141 termos e 10 tipos de exercício: múltipla escolha, completar, montar frase, escuta, ditado, frase longa bloco a bloco, leitura (terminal, Slack, PR, docs, e-mail, issue), ligar pares, fala e escrita
- **Repetição espaçada (SRS)** e glossário com áudio
- **Praticar meus erros:** o que você erra volta para treino
- **Histórico completo:** sessões, erros, mapa de atividade e acertos por habilidade
- **Nível separado por habilidade** (Leitura, Escrita, Escuta, Fala), de A1 a C2
- **Vozes do iPhone** com controle de velocidade e variação de sotaque (a partir do B1)
- **Backup** exportar/importar

## Publicar no GitHub Pages (grátis)

1. Crie um repositório no GitHub (ex.: `devenglish`). Pode ser público: **não há nenhuma chave no código**.
2. Envie todos os arquivos desta pasta para o repositório (pelo site: *Add file → Upload files*, arrastando tudo, incluindo as pastas `css`, `js` e `icons`).
3. No repositório: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
4. Em 1 ou 2 minutos o app estará em `https://SEU-USUARIO.github.io/devenglish/`.
5. No iPhone, abra esse endereço no **Safari → Compartilhar → Adicionar à Tela de Início**.

### Atualizar o app depois

Envie os arquivos alterados e **mude a versão em `sw.js`** (`const CACHE = "devenglish-v1.0.1"`). Assim o iPhone baixa a nova versão. Às vezes é preciso fechar e abrir o app duas vezes.

## Chave do Gemini (opcional)

A chave vai **dentro do app, em Ajustes**. Nunca coloque no código nem no GitHub: o repositório do Pages é público e qualquer pessoa poderia usar sua cota.

1. Acesse aistudio.google.com → **Get API key → Create API key em um novo projeto**
2. Cole no app em **Ajustes → IA · Gemini → Salvar chave** (o app escolhe o modelo sozinho)
3. **Não** ative faturamento. Sem cartão vinculado não existe cobrança; se a cota acabar, o app usa o modo sem IA.

## Testar no computador

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Estrutura

```
index.html            página principal
manifest.webmanifest  dados de instalação do PWA
sw.js                 service worker (offline)
css/styles.css        visual
js/content.js         TODO o conteúdo (lições, palavras, exercícios)
js/app.js             telas (Hoje, Trilhas, Revisar, Histórico, Ajustes)
js/session.js         motor dos exercícios
js/learn.js           missões diárias e repetição espaçada
js/audio.js           voz do iPhone e gravação
js/gemini.js          avaliação de fala e escrita com IA
js/store.js           dados salvos no aparelho
```

Para adicionar conteúdo, edite `js/content.js`. Em toda múltipla escolha, **a primeira opção é a correta** (o app embaralha).
