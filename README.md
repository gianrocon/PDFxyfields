# PDFxyfields

Ferramenta web para mapear visualmente as coordenadas **X, Y** de campos de
preenchimento em um PDF tamanho A4, gerando um arquivo JSON com o nome e a
posição de cada campo. Esse JSON é o que uma aplicação Python (ou de outra
stack) usa depois para inserir os dados de um formulário no PDF, pronto para
impressão.

Roda 100% no navegador (HTML + CSS + JS puro, com [PDF.js](https://mozilla.github.io/pdf.js/)
para renderizar o PDF) e usa um pequeno servidor Node.js só para salvar os
arquivos direto na pasta `maps/` do projeto.

## Por que usar

Em vez de adivinhar coordenadas de um PDF por tentativa e erro, você abre o
PDF na ferramenta, clica no ponto exato onde o texto deve aparecer, ajusta a
posição com precisão de décimos de ponto e exporta tudo num JSON padronizado
— reaproveitável em qualquer script de preenchimento de PDF.

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org/) instalado (sem dependências
extras, o `server.js` usa só módulos nativos).

Na raiz do projeto:

```bash
node server.js
```

O servidor sobe em `http://localhost:8085/`. Abra essa URL no navegador.

Para rodar em outra porta:

```bash
PORT=3000 node server.js
```

## Como usar

### 1. Abrir o PDF

Clique em **Abrir PDF** no cabeçalho e selecione o arquivo (A4, 595.28 x
841.89 pt). A página é renderizada no centro da tela com uma grade opcional
marcando os pontos PDF a cada 50pt.

### 2. Criar um campo

- Passe o mouse sobre a página: as coordenadas em tempo real (em pt e mm)
  aparecem na barra lateral esquerda.
- Clique no ponto onde o campo deve começar. Um marcador em L aparece
  indicando o ponto exato.
- Preencha o **Nome do Campo** (ex: `nm_paciente`, `dt_nascimento`) e o
  **Comprimento** (número de caracteres).
- Clique em **Criar Campo Aqui**.

O campo aparece como um retângulo vermelho tracejado sobre o PDF e na lista
de campos à direita.

### 3. Ajustar a posição

Selecione um campo (clicando nele na lista ou no retângulo sobre o PDF — ele
fica azul quando selecionado) para abrir o painel **Ferramentas do Campo**:

- **Posição (X, Y)**: digite o valor diretamente ou use os botões de nudge
  (`-1.0`, `-0.1`, `+0.1`, `+1.0`) para ajuste fino.
- **Fixar X / Fixar Y**: trava a coordenada atual para que o próximo campo
  criado já nasça alinhado (útil para colunas ou linhas de campos).
- Também é possível **arrastar o retângulo** direto sobre o PDF com o mouse.

### 4. Configurar aparência e formatação

- **Comprimento**: número de caracteres do campo.
- **Texto de exemplo**: ative para visualizar como o texto real vai ficar
  renderizado sobre o PDF (fonte, tamanho e espaçamento reais).
- **Fonte monoespaçada**: alterna entre Courier New, Consolas, Fira Code,
  Source Code Pro e Space Mono.
- **Tamanho da fonte** e **espaçamento entre caracteres** (letter-spacing).
- **Divisão em grupos**: separa os caracteres do campo em até 4 grupos com
  distância configurável entre eles — útil para campos como datas
  (`DD MM AAAA`), CNS, CEP, telefone, etc., onde os dígitos não ficam
  colados.

### 5. Salvar

Clique em **Salvar JSON** no cabeçalho:

- Se o servidor Node estiver rodando, o JSON (e o PDF, em base64) são salvos
  automaticamente na pasta `maps/`, nomeados a partir do PDF carregado.
- Se o servidor não estiver acessível, a ferramenta cai automaticamente para
  download direto pelo navegador.

Use **Carregar JSON** para reabrir um mapeamento salvo anteriormente e
continuar editando.

> Os campos também ficam salvos no `localStorage` do navegador por nome de
> PDF, então recarregar a página não perde o trabalho em andamento.

## Formato do JSON exportado

```json
{
  "pdfName": "formulario.pdf",
  "pageSize": { "widthPt": 595.28, "heightPt": 841.89, "unit": "pt" },
  "fields": [
    {
      "id": "field_1234567890",
      "label": "nm_paciente",
      "x": 120.5,
      "y": 700.0,
      "length": 30,
      "fontSize": 12,
      "fontFamily": "Courier New",
      "charWidthPt": 7.2,
      "letterSpacingPt": 0.0,
      "rawGroups": [30, null, null, null],
      "groups": [30],
      "groupDistancesPt": [],
      "heightPt": 12,
      "widthPt": 216,
      "sampleText": "nm_paciente",
      "showSampleText": false,
      "visible": true
    }
  ]
}
```

- **Origem (0,0)**: canto inferior esquerdo da página (padrão PDF, 72 pt = 1
  polegada).
- `x`, `y`: canto inferior-esquerdo onde o texto deve ser inserido (baseline).
- `groups` / `groupDistancesPt`: como o campo é dividido visualmente e o
  espaço entre os pedaços, para reconstruir o layout ao preencher o PDF
  programaticamente (ex.: com PyMuPDF/`fitz`, `insert_text`).

## Estrutura do projeto

```
PDFxyfields/
├── index.html      # Interface (3 colunas: mapeamento, viewport A4, ferramentas)
├── app.js           # Lógica da aplicação (estado, renderização, eventos)
├── styles.css        # Tema escuro e estilos dos componentes
├── server.js         # Servidor Node.js: serve os arquivos e salva JSON/PDF em maps/
└── maps/             # PDFs e JSONs salvos (criado automaticamente)
```

## Tecnologias

- JavaScript puro (sem framework/bundler)
- [PDF.js](https://mozilla.github.io/pdf.js/) (via CDN) para renderizar o PDF no `<canvas>`
- Node.js (`http` nativo) para o servidor de salvamento local
