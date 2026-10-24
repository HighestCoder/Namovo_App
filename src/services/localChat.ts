import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  createdAt: number;
}

const STORAGE_MESSAGES_KEY = '@namovo_chat_messages_v1';

const INITIAL_DEMO_MESSAGES: ChatMessage[] = [
  {
    id: 'demo-msg-1',
    senderName: 'Amor',
    text: 'Estava pensando em você agora mesmo... Não vejo a hora de te abraçar! ❤️',
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'demo-msg-2',
    senderName: 'Você',
    text: 'Você faz o meu dia sempre mais bonito. Te amo infinito! ✨',
    createdAt: Date.now() - 3600000,
  },
];

type MessageListener = (messages: ChatMessage[]) => void;
const listeners: Set<MessageListener> = new Set();

/**
 * Notifica todos os ouvintes registrados com a lista atualizada de mensagens
 */
const notifyListeners = (messages: ChatMessage[]) => {
  listeners.forEach((callback) => {
    try {
      callback(messages);
    } catch (err) {
      console.warn('Erro ao notificar ouvinte de chat:', err);
    }
  });
};

/**
 * Carrega as mensagens locais salvas no AsyncStorage com fallback inicial
 */
export const loadLocalChatMessages = async (): Promise<ChatMessage[]> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_MESSAGES_KEY);
    if (stored) {
      const parsed: ChatMessage[] = JSON.parse(stored);
      return parsed;
    }
    // Inicializa com mensagens demonstrativas românticas
    await AsyncStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(INITIAL_DEMO_MESSAGES));
    return INITIAL_DEMO_MESSAGES;
  } catch (err) {
    console.warn('Erro ao carregar mensagens locais de cartas:', err);
    return INITIAL_DEMO_MESSAGES;
  }
};

/**
 * Registra um ouvinte para receber mensagens atualizadas em tempo real localmente
 */
export const subscribeToLocalChatMessages = (
  callback: MessageListener
): (() => void) => {
  listeners.add(callback);

  // Envia as mensagens persistidas imediatamente ao cadastrar ouvinte
  loadLocalChatMessages().then((messages) => {
    callback(messages);
  });

  return () => {
    listeners.delete(callback);
  };
};

/**
 * Envia e persiste uma nova mensagem de amor localmente no AsyncStorage
 */
export const sendLocalChatMessage = async (
  senderName: string,
  text: string
): Promise<ChatMessage> => {
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    senderName,
    text: text.trim(),
    createdAt: Date.now(),
  };

  try {
    const existing = await loadLocalChatMessages();
    const updated = [...existing, newMsg];
    await AsyncStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(updated));
    notifyListeners(updated);
  } catch (err) {
    console.warn('Erro ao salvar nova carta localmente:', err);
  }

  return newMsg;
};

/**
 * Limpa o histórico de cartas caso o casal deseje reiniciar
 */
export const clearLocalChatMessages = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_MESSAGES_KEY);
    notifyListeners([]);
  } catch (err) {
    console.warn('Erro ao limpar histórico de cartas:', err);
  }
};
