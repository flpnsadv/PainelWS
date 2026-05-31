# Rito · Asset Pack

Pacote completo de identidade visual da marca **Rito** — pronto para uso em qualquer plataforma, projeto ou comunicação.

## Conteúdo

| Pasta / Arquivo | O que tem |
|-----------------|-----------|
| **`BRAND.md`** | **Documento principal.** Manual de referência para implementação em código (formato Claude Code-friendly). |
| **`Rito-Brand-Guide-v1.pdf`** | Brand guide visual completo, 8 páginas, pronto para arquivar e compartilhar. |
| `logo/` | Símbolo (r + pingo) em SVG + PNG, várias variantes (light, dark, mono, on-cream, on-dark) e tamanhos (256→2048px). |
| `logotype/` | Wordmark "rıto" em SVG + PNG, mesmas variantes (600→2400px). |
| `favicon/` | Favicon.svg + .ico multi-resolução + PNGs de 16 a 512px. |
| `avatar/` | Avatares quadrado, circular, Instagram e Open Graph image (1200×630). |
| `tokens/` | Tokens de design em **CSS / JSON / Tailwind / SCSS** — tudo sincronizado. |
| `fonts/` | Fraunces e Inter como TTF + `fonts.css` pronto pra importar. |

## Como começar

### Pra usar em uma plataforma visual (Figma, Canva, Notion)
1. Cores: abra `BRAND.md` na seção 3, copie os hex codes
2. Fontes: baixe Fraunces e Inter no [Google Fonts](https://fonts.google.com)
3. Logos: arraste os SVGs ou PNGs direto pra plataforma

### Pra usar em código (site, painel, app)
1. Copie a pasta `tokens/` e a pasta `fonts/` pro seu projeto
2. Importe `tokens/colors.css` e `fonts/fonts.css` no topo do CSS principal
3. Use as variáveis CSS (`var(--rito-clay-500)` etc.)
4. Veja `BRAND.md` seção 6 para componentes padrão

### Pra mandar pro Claude Code aplicar a marca em um projeto existente
1. Compartilhe a pasta inteira com o agente
2. Aponte-o pro `BRAND.md` — ele tem todas as instruções (seção 9)

## Filosofia de marca

> A advocacia já carrega tensão natural. A marca Rito traz leveza num ambiente naturalmente pesado.

Tudo neste pacote — cor, tipo, voz, espaçamento — serve a essa filosofia. Quando em dúvida, escolha o caminho mais leve.

---

**Versão:** 1.0  
**Tagline principal:** Todo bom advogado tem seu rito.
