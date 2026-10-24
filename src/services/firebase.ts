/**
 * Camada de Chat Local & Preparação para Backend
 * Configurada para execução e persistência 100% OFFLINE / LOCAL (AsyncStorage)
 * Conforme orientações, todo o fluxo opera localmente sem dependência de rede externa.
 */
import {
  ChatMessage,
  subscribeToLocalChatMessages,
  sendLocalChatMessage,
  loadLocalChatMessages,
  clearLocalChatMessages,
} from './localChat';

export type { ChatMessage };

export const subscribeToChatMessages = (
  onUpdate: (messages: ChatMessage[]) => void
): (() => void) => {
  return subscribeToLocalChatMessages(onUpdate);
};

export const sendChatMessage = async (
  senderName: string,
  text: string
): Promise<ChatMessage> => {
  return sendLocalChatMessage(senderName, text);
};

export { loadLocalChatMessages, clearLocalChatMessages };
