# Rito · Brand Reference para Claude Code

> Este documento é a fonte única de verdade da marca Rito para implementação em código. Se há conflito entre este arquivo e o PDF/brand guide, **este arquivo prevalece** (porque é o que está sincronizado com os tokens).

---

## 1. Identidade da marca

| Item | Valor |
|------|-------|
| **Nome** | Rito |
| **Categoria** | Plataforma estratégica e financeira para advogados |
| **Público** | Advogados autônomos, pequenos escritórios e escritórios estruturados |
| **Tom** | Acessível, próximo, leve (referência: Nubank) |
| **Tagline principal** | Todo bom advogado tem seu rito. |
| **URL canônica** | rito.app (a ser registrada) |
| **Handle social canônico** | @rito.painel |

### Filosofia de marca
> A advocacia já carrega tensão natural. A marca Rito traz leveza num ambiente naturalmente pesado. Toda decisão visual e verbal serve a essa filosofia.

---

## 2. Sistema de marca

A marca opera com **dois sinais visuais** que compartilham o mesmo DNA — o pingo terracota.

### 2.1 Logo (símbolo)
- **Arquivo principal:** `logo/rito-logo.svg`
- **Composição:** lowercase "r" em Fraunces + um pingo terracota flutuando acima-direita do stem
- **Uso:** favicon, avatar de redes, marca d'água, selo de rodapé, ícone de app — onde o nome "rito" já está implícito ou onde não cabe escrever
- **Tamanho mínimo:** 24×24 px (abaixo disso, perde reconhecimento)

### 2.2 Logotipo (wordmark)
- **Arquivo principal:** `logotype/rito-logotype.svg`
- **Composição:** "rıto" em Fraunces (com dotless i `\u0131`) + pingo terracota no lugar natural do tittle do "i"
- **Uso:** header do painel, capas de conteúdo, login, apresentações, materiais impressos
- **Proporção:** 2.4:1 (largura:altura)
- **Largura mínima:** 80 px (abaixo disso, o pingo perde definição)

### 2.3 Regras invioláveis
- ❌ **Nunca** rotacione, distorça, mude a cor do pingo, troque a fonte
- ❌ **Nunca** use o "i" comum (com tittle) no logotipo — precisa ser dotless
- ❌ **Nunca** coloque o logo dentro de uma forma adicional (caixa, círculo) sem necessidade — ele já tem ar próprio
- ✅ **Sempre** mantenha espaço de respiro igual à altura do pingo em todos os lados
- ✅ **Sempre** use a variante apropriada ao fundo (cream, dark, mono)

---

## 3. Paleta de cores

### 3.1 Primária — Terracota (Clay)

| Token | Hex | Uso |
|-------|-----|-----|
| `--rito-clay-100` | `#F4E1D5` | Fundo suave, chips, hover claro |
| `--rito-clay-300` | `#E2A689` | Hover/active da cor de marca |
| `--rito-clay-500` | `#C97B5F` | **Cor principal · botões, links, destaques** |
| `--rito-clay-700` | `#A85F47` | Hover de botões primários |
| `--rito-clay-800` | `#8B4A35` | Texto sobre fundo Clay 100, eyebrows |

### 3.2 Neutros quentes (modo claro)

| Token | Hex | Uso |
|-------|-----|-----|
| `--rito-creme` | `#FAF4EE` | **Fundo principal** |
| `--rito-creme-soft` | `#F2EDE5` | Fundo de cards |
| `--rito-border` | `#EDE3D7` | Bordas e divisores |
| `--rito-border-soft` | `#F0E8DC` | Bordas ainda mais sutis |
| `--rito-text-mid` | `#7A5A4E` | Subtítulos, captions |
| `--rito-text-dark` | `#3D2620` | **Texto principal, títulos** |

### 3.3 Modo escuro

| Token | Hex | Uso |
|-------|-----|-----|
| `--rito-dark-bg` | `#1E1612` | Fundo principal escuro |
| `--rito-dark-surface` | `#2A1F18` | Cards no modo escuro |
| `--rito-dark-border` | `#3D2C22` | Bordas no modo escuro |
| `--rito-dark-text` | `#FAF4EE` | Texto principal (mesmo creme do bg claro) |
| `--rito-dark-text-mid` | `#B5A398` | Texto secundário |

### 3.4 Semânticas (sempre terrosas — nunca fluorescentes)

| Tipo | Cor principal | Background suave | Família |
|------|---------------|------------------|---------|
| Sucesso | `#7E9968` | `#ECEFE3` | Verde-oliva |
| Atenção | `#D9A152` | `#FAF1DE` | Âmbar mel |
| Erro    | `#B85A4A` | `#F4DEDA` | Vermelho-tijolo |

**Regra:** semânticas só aparecem em **estados** (alertas, validações, status). Nunca como cor decorativa de UI estável.

---

## 4. Tipografia

### 4.1 Fontes

| Papel | Fonte | Fallback | Pesos usados |
|-------|-------|----------|--------------|
| Display (títulos, marca) | **Fraunces** | Georgia, 'Times New Roman', serif | 400 (regular), 500 (medium), italic |
| Corpo (UI, textos) | **Inter** | -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif | 400, 500, 600 |

Ambas são variable fonts. Arquivos `.ttf` estão em `/fonts/` deste pacote. Importação via `/fonts/fonts.css`.

### 4.2 Hierarquia tipográfica

| Token | Tamanho | Peso | Família | Uso |
|-------|---------|------|---------|-----|
| `display-xl` | 48px / 3rem | 400 | Fraunces | Hero, capas |
| `display-lg` | 36px / 2.25rem | 400 | Fraunces | Títulos de página |
| `h1` | 28px / 1.75rem | 400 | Fraunces | Cabeçalhos de seção |
| `h2` | 22px / 1.375rem | 500 | Fraunces | Subseções |
| `h3` | 18px / 1.125rem | 500 | Inter | Cards, blocos |
| `body-lg` | 16px / 1rem | 400 | Inter | Corpo padrão |
| `body` | 14px / 0.875rem | 400 | Inter | Corpo denso, tabelas |
| `caption` | 12px / 0.75rem | 400 | Inter | Legendas, microcopy |
| `eyebrow` | 11px / 0.6875rem | 500 | Inter, **uppercase, letter-spacing 0.12em**, cor `--rito-clay-800` | Rótulos de seção |

### 4.3 Letter-spacing recomendado
- Display Fraunces: `-0.02em` a `-0.025em` (apertado, mais elegante)
- Body Inter: `0` (default)
- Eyebrow uppercase: `0.12em` a `0.15em`

---

## 5. Espaçamento e raios

### 5.1 Escala de espaçamento (múltiplos de 4px)
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`

Tokens: `--rito-space-1` a `--rito-space-12`.

### 5.2 Raios de borda

| Token | Valor | Uso |
|-------|-------|-----|
| `--rito-radius-sm` | 6px | Inputs, chips |
| `--rito-radius-md` | 10px | Botões |
| `--rito-radius-lg` | 16px | Cards, painéis |
| `--rito-radius-pill` | 999px | Pills, badges, botões circulares |

### 5.3 Sombras
Quentes (não cinza puro) — sempre baseadas em `rgba(61, 38, 32, X)`:

| Token | Valor |
|-------|-------|
| `--rito-shadow-sm` | `0 1px 2px rgba(61, 38, 32, 0.06)` |
| `--rito-shadow-md` | `0 4px 12px rgba(61, 38, 32, 0.08)` |
| `--rito-shadow-lg` | `0 12px 32px rgba(61, 38, 32, 0.10)` |

---

## 6. Componentes — padrões de referência

### 6.1 Botão primário
```css
background: var(--rito-clay-500);
color: var(--rito-creme);
padding: 12px 24px;
border-radius: var(--rito-radius-pill);
font-family: var(--rito-font-body);
font-weight: 500;
font-size: 14px;
/* hover */ background: var(--rito-clay-700);
```

### 6.2 Botão secundário
```css
background: transparent;
color: var(--rito-clay-800);
border: 1px solid var(--rito-border);
padding: 11px 23px; /* -1px para compensar a borda */
border-radius: var(--rito-radius-pill);
/* hover */ background: var(--rito-clay-100);
```

### 6.3 Card padrão
```css
background: var(--rito-creme-soft);
border: 0.5px solid var(--rito-border);
border-radius: var(--rito-radius-lg);
padding: 24px;
box-shadow: var(--rito-shadow-sm);
```

### 6.4 Input
```css
background: var(--rito-creme);
border: 1px solid var(--rito-border);
border-radius: var(--rito-radius-sm);
padding: 10px 14px;
font-family: var(--rito-font-body);
font-size: 14px;
/* focus */ border-color: var(--rito-clay-500);
            box-shadow: 0 0 0 3px rgba(201, 123, 95, 0.15);
```

### 6.5 Eyebrow / label de seção
```css
font-size: 11px;
font-weight: 500;
color: var(--rito-clay-800);
text-transform: uppercase;
letter-spacing: 0.12em;
```

---

## 7. Voz e linguagem

### 7.1 Cinco princípios (consultar antes de escrever qualquer microcopy)
1. **Próximo, sem ser íntimo demais** — colega de profissão organizado, não "tio do TikTok" nem parecerista centenário
2. **Concreto, nunca abstrato** — nomear cada coisa pelo nome dela, zero buzzword
3. **Sem peso, sem caricato** — nada de caixa-alta de alerta nem brincadeira com a dor do advogado
4. **Brasileiro de verdade** — honorários, cliente, causa, proposta. Estrangeirismo só sem equivalente natural (BACEN, OAB)
5. **Sempre devolve dignidade à gestão** — tratar gestão financeira como parte da boa advocacia, nunca como mal necessário

### 7.2 Vocabulário canônico do produto

| Use | Não use |
|-----|---------|
| "honorários" | "fees" |
| "cliente" | "lead" |
| "proposta" | "quote", "orçamento" |
| "causa" / "caso" | "matter", "deal" |
| "calculadora" | "calculator" |
| "distribuição" | "split", "breakdown" |
| "revisional" | "review" |
| "painel" | "dashboard" (mas tudo bem em contexto técnico) |

### 7.3 Taglines secundárias (rotação em conteúdo)
- "Cobrar bem é parte da advocacia." (manifesto)
- "Menos planilha. Mais advocacia." (funcional)
- "O rito por trás de cada bom caso." (bastidor)
- "Direito é vocação. Gestão é escolha." (reflexivo)

---

## 8. Inventário de assets

```
rito-assets/
├── BRAND.md                          ← este arquivo
├── README.md                         ← guia de uso do pacote
├── Rito-Brand-Guide-v1.pdf           ← brand guide visual completo
│
├── logo/                             ← símbolo (r + pingo)
│   ├── rito-logo.svg                 ← versão principal (sem fundo)
│   ├── rito-logo-on-cream.svg        ← com fundo creme
│   ├── rito-logo-on-dark.svg         ← invertido (fundo escuro)
│   ├── rito-logo-mono-dark.svg       ← monocromático escuro
│   ├── rito-logo-mono-light.svg      ← monocromático claro
│   ├── rito-logo-black.svg           ← preto puro
│   ├── rito-logo-white.svg           ← branco puro
│   └── *.png                         ← PNGs em 256/512/1024/2048
│
├── logotype/                         ← wordmark (rıto + pingo no i)
│   └── (mesma estrutura do logo, com PNGs em 600/1200/2400)
│
├── favicon/
│   ├── favicon.svg                   ← scalable, recomendado
│   ├── favicon.ico                   ← multi-resolução (16/32/48/64)
│   └── favicon-{16,32,48,64,96,180,192,256,512}.png
│
├── avatar/
│   ├── avatar-square-1024.png        ← redes sociais (quadrado)
│   ├── avatar-circle-1024.png        ← redes sociais (circular, alpha)
│   ├── avatar-instagram-1080.png     ← Instagram
│   ├── og-image.png                  ← OG/Twitter card 1200×630
│   └── og-image.svg
│
├── tokens/
│   ├── colors.css                    ← CSS custom properties (USE ESTE)
│   ├── tokens.json                   ← Design Tokens Format
│   ├── tailwind.config.snippet.js    ← extensão do Tailwind
│   └── _variables.scss               ← SCSS
│
└── fonts/
    ├── Fraunces-Variable.ttf         ← display
    ├── Inter-Variable.ttf            ← corpo
    └── fonts.css                     ← @font-face pronto
```

---

## 9. Instruções para Claude Code aplicar a marca no painel

### Passo 1 · Importar fontes
1. Copiar `fonts/Fraunces-Variable.ttf` e `fonts/Inter-Variable.ttf` para `/fonts/` do projeto
2. Copiar `fonts/fonts.css` para o projeto e importar no topo do CSS principal

### Passo 2 · Importar tokens
1. Copiar `tokens/colors.css` para o projeto
2. Importar **antes** de qualquer outro CSS para que as variáveis estejam disponíveis em toda a cascata

### Passo 3 · Substituir referências antigas
- Toda referência ao logo/nome "Windsor & Serrão" → substituir pelo logotipo Rito (`logotype/rito-logotype-on-cream.svg` para modo claro, `rito-logotype-on-dark.svg` para modo escuro)
- Favicon → `favicon/favicon.svg` ou os PNGs

### Passo 4 · Atualizar paleta
Mapear cores antigas → novas:
- Fundo principal → `var(--color-bg)`
- Cor de destaque (botões/links) → `var(--color-accent)` (Clay 500)
- Texto principal → `var(--color-text)`
- Bordas → `var(--color-border)`
- Verde de sucesso → `var(--rito-success)` (oliva, não fluo)
- Vermelho de erro → `var(--rito-error)` (tijolo, não código)

### Passo 5 · Atualizar tipografia
- Títulos: `font-family: var(--rito-font-display)` (Fraunces)
- Corpo: `font-family: var(--rito-font-body)` (Inter)
- Atenção aos letter-spacing recomendados (§4.3)

### Passo 6 · Revisar microcopy
- Aplicar vocabulário canônico (§7.2)
- Cinco princípios de voz (§7.1)
- Atualizar título da aba do navegador para `Rito — Painel`

### Passo 7 · Suportar modo escuro
- Adicionar toggle `data-theme="dark"` no `<html>`
- A paleta dark já está definida em `colors.css` via seletor `[data-theme="dark"]`

---

## 10. Versão e mudanças

| Versão | Data | Mudanças |
|--------|------|----------|
| v1.0 | 2026-05 | Brand guide inicial: nome, logo/logotipo, paleta, tipografia, voz, taglines |

---

**Em caso de dúvida na implementação:** este arquivo é a referência. O brand guide PDF é a versão "human-readable" do mesmo conteúdo. Os tokens `.css`/`.json`/`.scss`/`.js` são a versão "machine-readable" — todos devem ter os mesmos valores. Se você notar discrepância entre eles, alerte o Filipe antes de prosseguir.
