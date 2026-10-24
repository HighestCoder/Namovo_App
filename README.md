# Namovo — Nosso Espaço Privativo a Dois ✨

**Namovo** é um aplicativo mobile e web progressivo (PWA) desenvolvido sob medida para casais que desejam eternizar sua história, planejar encontros, compartilhar listas de desejos, marcar compromissos especiais e trocar cartas de amor em um **ambiente estritamente privado, seguro e com estética romântica minimalista inspirada no iOS**.

---

## 🎯 Propósito do Aplicativo

Construído como um refúgio digital exclusivo para o casal, o **Namovo** prioriza a **privacidade absoluta**, a **fluidez visual** e a **persistência local sem perda de dados (*Zero Data Loss*)**. Cada interação foi desenhada com tipografia serifada editorial (*Didot* / *Playfair Display*), paleta em tons de marfim, lavanda suave e cobre quente (`#C68B59`), micro-animações elásticas e feedback tátil (*haptics*) refinado.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia / Biblioteca | Finalidade |
| :--- | :--- | :--- |
| **Framework Base** | **React Native (0.88) & Expo SDK 58** | Arquitetura mobile multiplataforma (iOS, Android e Web PWA) |
| **Linguagem** | **TypeScript (6.0)** | Tipagem estrita e segurança em tempo de compilação |
| **Estilização & UI** | **StyleSheet Nativo + NativeWind (Tailwind CSS)** | Layouts responsivos, *glassmorphism*, sombras difusas e gradientes (`expo-linear-gradient`) |
| **Persistência Local** | **AsyncStorage (`@react-native-async-storage/async-storage`)** | Armazenamento local assíncrono com zero perda de dados entre sessões |
| **Biometria & Segurança** | **Expo Local Authentication (`expo-local-authentication`)** | Desbloqueio nativo *opt-in* via **Face ID** e **Touch ID / Impressão Digital** |
| **Notificações Locais** | **Expo Notifications (`expo-notifications`)** | Alertas locais imediatos e agendamento de lembretes de calendário no próprio dispositivo |
| **Feedback Tátil** | **Expo Haptics (`expo-haptics`)** | Resposta vibratória sutil no teclado de PIN, navegação e confirmações |
| **Mídia & Área de Transferência** | **`expo-image-picker`, `expo-file-system`, `expo-clipboard`** | Captura/seleção de fotos do casal e cópia rápida do Código do Casal |
| **Ícones** | **Lucide React Native (`lucide-react-native`)** | Iconografia minimalista de traço fino |
| **Hospedagem** | **Firebase Hosting** | Distribuição web segura com cabeçalhos de privacidade e anti-indexação |

---

## 🔒 Arquitetura de Privacidade e Segurança

O **Namovo** implementa uma arquitetura de defesa em múltiplas camadas para garantir que apenas o casal tenha acesso às suas memórias:

### 1. Barreira Inicial de Acesso Privado (PIN de 6 Dígitos)
- Ao abrir o aplicativo pela primeira vez, a tela **`LockScreen`** bloqueia integralmente o acesso até que o código privativo de 6 dígitos seja inserido.
- **Feedback Visual e Tátil:** Tentativas incorretas acionam uma animação horizontal de tremor (*shake*), vibração háptica de erro e limpeza automática dos indicadores.
- **Persistência de Acesso:** Após a validação inicial, a flag `@namovo_has_private_access` é salva localmente no `AsyncStorage`.

### 2. Biometria *Opt-in* (Face ID / Touch ID)
- Seguindo práticas rigorosas de segurança, o primeiro acesso **sempre exige o PIN**.
- Dentro do menu **Ajustes**, o casal pode ativar a opção **"Habilitar acesso por Biometria"** (`@namovo_biometrics_enabled_v1`).
- Quando habilitada, a tela de bloqueio aciona automaticamente o prompt de **Face ID** ou **Touch ID** ao ser exibida, oferecendo *fallback* imediato para o teclado de 6 dígitos caso o usuário cancele.

### 3. Auto-Lock Inteligente em Segundo Plano (`AppState`)
- O aplicativo monitora continuamente o estado de execução via `AppState`.
- Caso o app permaneça minimizado ou em segundo plano por **mais de 2 minutos**, a sessão é automaticamente bloqueada (`isAutoLocked = true`), exigindo nova autenticação biométrica ou PIN ao retornar ao primeiro plano.

### 4. Proteção Anti-Indexação (Web / PWA)
- Injeção dinâmica de meta tags `noindex, nofollow, noarchive, nosnippet` para impedir que motores de busca indexem qualquer conteúdo quando executado na Web.

---

## ✨ Funcionalidades Principais

###  🔗 1. Sistema de Pareamento (*Couple Code*)
- Tela dedicada (**`PairingView`**) para conectar o casal através de um **código único de 5 caracteres alfanuméricos** (ex: `AMOR7`, `LOVE9`).
- **Modo Gerar Código:** Cria um código exclusivo com cópia rápida para a área de transferência e disparo de notificação comemorativa.
- **Modo Inserir Código:** Cinco caixas visuais interativas com formatação automática em caixa alta para vincular o código recebido do parceiro.
- Salvo na chave `@namovo_couple_id_v1`, ignorando a etapa de pareamento nos acessos futuros.

### ⏳ 2. Cronômetro em Tempo Real & Painel Central (`HomeView`)
- **Contagem Progressiva ao Vivo:** Calcula e atualiza a cada segundo o tempo exato de relacionamento em **Anos, Meses, Semanas, Dias, Horas, Minutos e Segundos**.
- **Modos de Visualização Alternáveis:** Toque no contador para alternar entre *Dias + Relógio*, *Contagem para o Próximo Marco Comemorativo* e *Horas Totais Juntos*.
- **Sintonia do Casal & Toques de Carinho:** Pílula interativa de humor do casal e contador de corações flutuantes ao tocar na fotografia central.
- **Quadro de Foto em Destaque (`FeaturedMediaModal`):** Permite escolher fotos da galeria, capturar com a câmera ou selecionar fotografias curadas com legenda personalizada.

### 💌 3. Cartas de Amor (`CartasModal`)
- Mensageiro rápido e intimista no canto inferior esquerdo para envio de cartas curtas e declarações.
- **Histórico Cronológico Persistente:** Todas as mensagens ficam salvas localmente em `@namovo_chat_messages_v1` com rolagem automática e alternância de remetente.
- **Notificações Locais Instantâneas:** Envia um alerta local imediato (*"[Parceiro] te enviou uma carta ❤️"*) sempre que uma nova mensagem é registrada.
- **Tratamento de Teclado:** Envolvido em `KeyboardAvoidingView` para garantir que o campo de digitação nunca seja encoberto.

### 🗓️ 4. Calendário do Casal (`CalendarModal`)
- Botão circular posicionado na lateral média direita da tela principal.
- **Grade Mensal Customizável:** Permite navegar pelos meses, selecionar dias específicos e marcar compromissos ou datas especiais.
- **Emojis Personalizados na Grade:** Cada data marcada exibe diretamente o emoji escolhido (`🍷`, `🎬`, `✈️`, `🌹`, `💍`, etc.) no calendário.
- **Lembretes Programados:** Agenda notificações locais no dispositivo para a data e horário do encontro marcado (`@namovo_calendar_events_v2`).

### 🎁 5. Lista de Presentes & Desejos (`GiftsModal`)
- Botão circular posicionado na lateral média esquerda, perfeitamente alinhado ao botão de Calendário.
- **Formulário Completo de 3 Campos:**
  1. **Nome do Presente** (validação obrigatória)
  2. **Link de Compra** (higienização automática de protocolo `https://` e extração elegante do domínio)
  3. **Notas & Especificações** (tamanho, cor, detalhes em múltiplas linhas)
- **Filtros & Status:** Filtragem por parceiro ou itens já adquiridos, com alertas locais sutis ao salvar um novo desejo (`@namovo_gift_ideas_v1`).

### 🎡 6. Encontros (`DateNightRouletteModal`) & ✈️ Viagens (`TravelFeedModal`)
- **Roleta de Encontros (Superior Esquerdo):** Sorteio animado com desaceleração física para decidir o próximo encontro do casal e chuva comemorativa de confetes.
- **Diário de Viagens (Superior Direito):** Feed visual estilo álbum polaroid com carrossel de fotos, datas, destinos e legendas das viagens realizadas.

---

## 🗂️ Mapeamento de Persistência Local (`AsyncStorage`)

Todos os dados do aplicativo são armazenados localmente no dispositivo e carregados automaticamente na inicialização:

| Chave no `AsyncStorage` | Descrição dos Dados |
| :--- | :--- |
| `@namovo_has_private_access` | Flag booleana de desbloqueio da barreira inicial de privacidade |
| `@namovo_biometrics_enabled_v1` | Preferência *opt-in* do usuário para autenticação via Face ID / Touch ID |
| `@namovo_couple_id_v1` | Código alfanumérico de 5 caracteres de conexão do casal |
| `@namovo_couple_data_v1` | Nomes do casal, data de início (`YYYY-MM-DD`), URI da foto e legenda |
| `@namovo_chat_messages_v1` | Histórico completo de cartas e mensagens trocadas |
| `@namovo_calendar_events_v2` | Eventos agendados no calendário com emojis, horários e notas |
| `@namovo_gift_ideas_v1` | Lista de ideias de presentes, links de compra e especificações |
| `@namovo_roulette_locations_v1` | Locais cadastrados na Roleta de Encontros |
| `@namovo_trips_v1` | Álbum de viagens e fotografias do casal |
| `@namovo_couple_mood_v1` / `@namovo_love_taps_v1` | Estado de humor atual e contador de carinhos na foto |

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js** (LTS v20+ ou v24+)
- **npm** ou **Bun**
- Aplicativo **Expo Go** no celular (iOS / Android) ou navegador Web

### Passo a Passo

```bash
# 1. Instalar as dependências compatíveis com o Expo SDK
npm install

# 2. Iniciar o servidor de desenvolvimento local
npx expo start

# 3. Verificação de tipos e linting
npx tsc --noEmit
npm run lint
```

### Build de Produção para Web & Deploy no Firebase

```bash
# Exportar pacote otimizado para Web (gera o diretório dist/)
npx expo export -p web

# Fazer deploy para o Firebase Hosting
firebase deploy --only hosting
```

---

Desenvolvido com carinho e atenção aos detalhes para celebrar histórias de amor com privacidade e elegância. ❤️
