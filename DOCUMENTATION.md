# 📱 Namovo — Documentação Técnica e Guia Completo do Sistema

> **Namovo** é um aplicativo mobile e Progressive Web App (PWA) de luxo para casais desenvolvido em **React Native**, **Expo SDK 58** e **Tailwind CSS (NativeWind v4)** com design limpo, moderno e sofisticado inspirado nas diretrizes visuais do **iOS**.

---

## 📑 Tabela de Conteúdos

1. [Visão Geral & Filosofia de Design](#1-visão-geral--filosofia-de-design)
2. [Arquitetura de Segurança: Authentication Wall & Lock Screen](#2-arquitetura-de-segurança-authentication-wall--lock-screen)
3. [Privacidade Absoluta & Anti-Indexação (Robots)](#3-privacidade-absoluta--anti-indexação-robots)
4. [Otimizações PWA & iOS (Save to Home Screen)](#4-otimizações-pwa--ios-save-to-home-screen)
5. [Armazenamento Robusto de Mídia Híbrido (Native FileSystem & Web Data)](#5-armazenamento-robusto-de-mídia-híbrido)
6. [Arquitetura de Estados & Telas](#6-arquitetura-de-estados--telas)
7. [Componentes dos 4 Cantos Interativos](#7-componentes-dos-4-cantos-interativos)
8. [Widget Mini Portrait & Background Gradiente](#8-widget-mini-portrait--background-gradiente)
9. [Cálculo Preciso do Cronômetro de Amor](#9-cálculo-preciso-do-cronômetro-de-amor)
10. [Paleta de Cores & Tokens](#10-paleta-de-cores--tokens)
11. [Instruções de Execução](#11-instruções-de-execução)

---

## 1. Visão Geral & Filosofia de Design

O Namovo foi projetado para casais que buscam uma estética **madura, elegante e acolhedora**, com privacidade total:
- **Design Bespoke**: Linhas puras, cantos curvos suaves (`borderRadius: 20-36`), sombras translúcidas difusas e botões em vidro fosco (*glassmorphism*).
- **Gradiente Atmosférico**: Transição sutil de um branco pérola translúcido para névoa de lavanda pastel (`#FDFBFB` → `#F9F5FC` → `#F3ECF8` → `#ECE4F4`).
- **Segurança Nativa**: Barreira obrigatória de autenticação por PIN antes de renderizar qualquer conteúdo do casal.

---

## 2. Arquitetura de Segurança: Authentication Wall & Lock Screen

Arquivo: `src/components/LockScreen.tsx` integrado no root `App.tsx`

### Barreira Obrigatória de Entrada:
- **Impossibilidade de Burlar por Roteamento**: Enquanto o estado `isAuthenticated` não for verdadeiro, o React monta **exclusivamente** o componente `LockScreen`. Nenhum componente de Onboarding ou Dashboard sequer existe na árvore de renderização.
- **PIN de 4 Dígitos Personalizado**:
  - No primeiro acesso, o casal define seu próprio PIN de 4 dígitos com confirmação instantânea.
  - O PIN é armazenado em `@namovo_user_pin`.
  - Sessão persistente registrada em `@namovo_auth_session_v1` para evitar logins repetitivos desnecessários no mesmo dispositivo.
- **Interface Estilo iOS Keypad**:
  - 4 círculos (*dots*) com preenchimento em tom cobre e animação de tremor (*shake animation*) em caso de código incorreto.
  - Teclado numérico minimalista com resposta tátil elástica.
  - Código mestre de contingência (`1234`) para recuperação emergencial caso o casal esqueça a senha.
- **Bloqueio Sob Demanda**:
  - No menu de configurações (⚙️), o usuário pode clicar em *"Bloquear Aplicativo Agora"* para encerrar a sessão imediatamente.

---

## 3. Privacidade Absoluta & Anti-Indexação (Robots)

Garante que mecanismos de busca (Google, Bing, Yahoo, etc.) **nunca indexem, rastreiem ou exponham** a URL privada do casal.

1. **Injeção Estática em `public/index.html`**:
   ```html
   <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
   <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
   <meta name="bingbot" content="noindex, nofollow, noarchive, nosnippet" />
   ```
2. **Garantia em Tempo de Execução (`App.tsx`)**:
   - Injeção forçada no `document.head` via JavaScript para cobrir qualquer ambiente web ou preview dinâmico.

---

## 4. Otimizações PWA & iOS (Save to Home Screen)

Arquivos: `public/index.html`, `public/manifest.json` e `app.json`

O aplicativo é configurado para oferecer uma experiência indistinguível de um app nativo quando salvo na tela de início do iPhone (*Add to Home Screen*):

- **Modo Standalone Sem Barras de Navegador**:
  ```html
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Namovo" />
  ```
- **Bloqueio de Elastic Bounce**: CSS embutido que previne o efeito de mola indesejado do Safari no corpo da página.
- **Suporte ao Safe Area do iPhone**:
  `viewport-fit=cover` e `user-scalable=no` garantindo renderização até as bordas do Dynamic Island e barra de início.
- **Manifest PWA**: `public/manifest.json` com `display: standalone` e cores coordenadas (`#FDFBFB`).

---

## 5. Armazenamento Robusto de Mídia Híbrido (Native FileSystem & Web IndexedDB)

Arquivos: `src/utils/localMediaStorage.ts` e `src/utils/webIndexedDB.ts` integrados em `src/utils/mediaPicker.ts`

- **Ambiente Nativo (iOS/Android)**:
  - Cópia física direta via `FileSystem.copyAsync` para `FileSystem.documentDirectory + 'namovo_media/'`.
  - Zero dependência de Base64 em memória e zero risco de exclusão pela limpeza de cache temporário do sistema operacional.
- **Ambiente Web / PWA (Mobile Safari & Chrome)**:
  - O `localStorage` dos navegadores móveis impõe um limite estrito de ~5MB, o que causaria falhas `QuotaExceededError` ao salvar fotos de alta resolução do rolo de câmera.
  - Para contornar essa restrição, o Namovo utiliza uma camada de persistência híbrida:
    1. Conversão dos URLs temporários `blob:` em dados persistentes.
    2. Armazenamento automático no banco de dados local **`IndexedDB`** do navegador (`namovo_pwa_db` / `media_store`), garantindo capacidade ampla de armazenamento offline sem estourar quotas.
    3. As fotos continuam acessíveis e preservadas mesmo após fechar o navegador ou reabrir o PWA a partir da tela de início do iPhone.

---

## 6. Arquitetura de Estados & Telas

1. **Lock Screen (`LockScreen.tsx`)**: Parede de segurança obrigatória com teclado numérico e indicador de 4 dots.
2. **Onboarding (`OnboardingView.tsx`)**: Formulário inicial para cadastrar nomes e data de início com máscara.
3. **Home (`HomeView.tsx`)**: Painel principal com Mini Portrait flutuante, cronômetro progressivo e botões de canto.

---

## 7. Componentes dos Cantos e Laterais Interativos

- ❤️ **Superior Esquerdo (Roleta de Encontros)**: Roleta interativa com locais salvos, fotos e confetes.
- ✈️ **Superior Direito (Feed de Viagens)**: Diário de viagens do casal com álbuns de fotos.
- 🎁 **Meio Esquerdo (Lista de Presentes & Mimos)**: Modal interativo de wishlist com formulário para cadastrar ideias (Nome, Link de compra e Anotações/tamanho/cor), lista de mimos salvos, link direto para lojas e marcação de itens já comprados com persistência local (`@namovo_gift_ideas_v1`).
- 🗓️ **Meio Direito (Calendário do Casal)**: Modal interativo com visão de mês completo, marcação de datas especiais e encontros futuros com emojis customizados na grade e persistência local (`@namovo_calendar_events_v2`).
- 🌹 **Inferior Esquerdo (Cartas & Mensagens em Tempo Real)**: Modal mensageiro romântico rápido com histórico rolável, envio estilizado, sincronização em tempo real via Firestore (`onSnapshot`) e notificações push locais/remotas via Expo Notifications (`@namovo_chat_messages_v1`).
- ⚙️ **Inferior Direito (Configurações)**: Edição de nomes/data com atualização imediata e botão para bloquear o app.

---

## 8. Widget Mini Portrait & Background Gradiente

- Retrato central em proporção esbelta (158px × 198px) com curvatura *pebble* (`borderRadius: 36`).
- Sombra difusa flutuante (`shadowRadius: 36`, `shadowOpacity: 0.08`).
- Botão "Trocar" e legenda em vidro fosco *glassmorphism* com desfoque de fundo.

---

## 9. Cálculo Preciso do Cronômetro de Amor

Arquivo: `src/utils/timeCalculation.ts`

Calcula o tempo real transcorrido tratando variações de anos bissextos e quantidade de dias por mês (28, 29, 30 ou 31):

$$\text{Anos} \rightarrow \text{Meses} \rightarrow \text{Semanas} \rightarrow \text{Dias}$$

Atualizado a cada segundo via `setInterval`.

---

## 10. Paleta de Cores & Tokens

| Token | Valor Hex/RGBA | Aplicação |
|---|---|---|
| `background` | `#FFFFFF` | Base limpa |
| `gradientTop` | `#FDFBFB` | Branco pérola translúcido |
| `gradientMiddle` | `#F9F5FC` | Névoa de lilás suave |
| `gradientBottom` | `#F3ECF8` | Lilás pastel delicado |
| `gradientBottomAlt`| `#ECE4F4` | Lavanda cashmere suave |
| `accent` | `#C68B59` | Destaque sofisticado cobre/ouro rosa |
| `accentDark` | `#A87040` | Variação escura para contraste |
| `accentSoft` | `rgba(198, 139, 89, 0.10)` | Fundos sutis |
| `textPrimary` | `#2D2D2D` | Tipografia de alto contraste |
| `textSecondary` | `#6B6864` | Subtítulos |

---

## 11. Implantação no Firebase Hosting & Scripts

Arquivo: `firebase.json` e `.firebaserc`

- **Ambiente de Produção**: `https://namovo-310125.web.app` (e `https://namovo-310125.firebaseapp.com`)
- **Console do Projeto**: `https://console.firebase.google.com/project/namovo-310125/overview`
- **Diretório Público**: `dist` (gerado por `npm run build:web`)
- **SPA Rewrites**: Redirecionamento de todas as rotas para `/index.html`
- **Headers HTTP Verificados em Produção**:
  - `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` (Bloqueio total de buscadores no nível HTTP)
  - `Strict-Transport-Security: max-age=31556926; includeSubDomains; preload`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`

### Como republicar atualizações:
```bash
npm run deploy
```
