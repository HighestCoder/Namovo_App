import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  AppState,
} from 'react-native';
import {
  Send,
  X,
  Mail,
  Heart,
  Sparkles,
  User,
  Clock,
  CheckCheck,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import {
  ChatMessage,
  subscribeToChatMessages,
  sendChatMessage,
} from '../services/firebase';
import {
  registerForPushNotificationsAsync,
  triggerPartnerMessageNotification,
} from '../services/notifications';
import { triggerSuccessHaptic, triggerLightHaptic } from '../utils/haptics';

interface CartasModalProps {
  visible: boolean;
  onClose: () => void;
  partner1Name?: string;
  partner2Name?: string;
}

export const CartasModal: React.FC<CartasModalProps> = ({
  visible,
  onClose,
  partner1Name = 'Amor',
  partner2Name = 'Você',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentSender, setCurrentSender] = useState<string>(partner1Name);

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(350)).current;
  const scrollViewRef = useRef<any>(null);

  // Configuração inicial de permissões de Notificação
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  // Monitora estado do app para notificações em segundo plano / primeiro plano
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      appState.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // Assinatura em tempo real do Firestore via onSnapshot
  useEffect(() => {
    let initialLoaded = false;
    const unsubscribe = subscribeToChatMessages((remoteMessages) => {
      // Ordenação cronológica estrita
      const sorted = [...remoteMessages].sort((a, b) => a.createdAt - b.createdAt);

      // Notificação se uma nova mensagem do parceiro chegar enquanto o modal ou app estiver em background/foreground
      if (initialLoaded && sorted.length > messages.length) {
        const latestMsg = sorted[sorted.length - 1];
        if (latestMsg.senderName !== currentSender) {
          triggerPartnerMessageNotification(latestMsg.senderName, latestMsg.text);
        }
      }

      setMessages(sorted);
      setIsLoading(false);
      initialLoaded = true;

      // Rola automaticamente para o fim ao receber nova mensagem
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    });

    return () => {
      unsubscribe();
    };
  }, [currentSender, messages.length]);

  // Transições de abertura e fechamento
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      });
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(350);
      setInputText('');
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleClose = () => {
    triggerLightHaptic();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 350,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Enviar mensagem
  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || isSending) return;

    setIsSending(true);
    setInputText('');
    triggerSuccessHaptic();

    try {
      await sendChatMessage(currentSender, textToSend);

      // Dispara push notification local para a carta enviada
      await triggerPartnerMessageNotification(currentSender, textToSend);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.warn('Erro ao enviar mensagem:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Formatação amigável de hora
  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <Animated.View
                style={[
                  styles.modalCard,
                  {
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                {/* Grabber & Fechar */}
                <View style={styles.grabber} />
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                  accessibilityLabel="Fechar Cartas"
                >
                  <X size={18} color="#6B6864" strokeWidth={2.2} />
                </TouchableOpacity>

                {/* Cabeçalho */}
                <View style={styles.header}>
                  <View style={styles.badgeWrapper}>
                    <Mail size={13} color={COLORS.accent} strokeWidth={2.4} />
                    <Text style={styles.badgeText}>CARTAS & MENSAGENS EM TEMPO REAL</Text>
                  </View>
                  <Text style={styles.title}>Nossas Cartas de Amor</Text>
                  <Text style={styles.subtitle}>
                    Troque bilhetes românticos com sincronização instantânea no Firebase.
                  </Text>

                  {/* Alternador de remetente */}
                  <View style={styles.senderPickerRow}>
                    <Text style={styles.senderPickerLabel}>Escrevendo como:</Text>
                    <View style={styles.senderPillGroup}>
                      <TouchableOpacity
                        onPress={() => setCurrentSender(partner1Name)}
                        style={[
                          styles.senderPill,
                          currentSender === partner1Name && styles.senderPillActive,
                        ]}
                        activeOpacity={0.8}
                      >
                        <User
                          size={12}
                          color={currentSender === partner1Name ? COLORS.accentDark : '#847A94'}
                        />
                        <Text
                          style={[
                            styles.senderPillText,
                            currentSender === partner1Name && styles.senderPillTextActive,
                          ]}
                        >
                          {partner1Name}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setCurrentSender(partner2Name)}
                        style={[
                          styles.senderPill,
                          currentSender === partner2Name && styles.senderPillActive,
                        ]}
                        activeOpacity={0.8}
                      >
                        <User
                          size={12}
                          color={currentSender === partner2Name ? COLORS.accentDark : '#847A94'}
                        />
                        <Text
                          style={[
                            styles.senderPillText,
                            currentSender === partner2Name && styles.senderPillTextActive,
                          ]}
                        >
                          {partner2Name}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* HISTÓRICO DE MENSAGENS */}
                <View style={styles.messagesContainer}>
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={COLORS.accent} />
                      <Text style={styles.loadingText}>Buscando nossas cartas...</Text>
                    </View>
                  ) : messages.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <View style={styles.emptyIconCircle}>
                        <Mail size={26} color={COLORS.accent} />
                        <Heart
                          size={13}
                          color="#D9536F"
                          fill="#D9536F"
                          style={styles.emptyHeartBadge}
                        />
                      </View>
                      <Text style={styles.emptyTitle}>Nenhuma carta enviada ainda</Text>
                      <Text style={styles.emptySubtitle}>
                        Escreva o primeiro bilhete carinhoso abaixo para surpreender seu amor!
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      ref={scrollViewRef}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.messagesScrollContent}
                      keyboardShouldPersistTaps="handled"
                    >
                      {messages.map((msg) => {
                        const isMe = msg.senderName === currentSender;

                        return (
                          <View
                            key={msg.id}
                            style={[
                              styles.messageRow,
                              isMe ? styles.messageRowMe : styles.messageRowPartner,
                            ]}
                          >
                            <View
                              style={[
                                styles.messageBubble,
                                isMe ? styles.messageBubbleMe : styles.messageBubblePartner,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.messageSenderName,
                                  isMe ? styles.messageSenderNameMe : styles.messageSenderNamePartner,
                                ]}
                              >
                                {msg.senderName}
                              </Text>

                              <Text
                                style={[
                                  styles.messageText,
                                  isMe ? styles.messageTextMe : styles.messageTextPartner,
                                ]}
                              >
                                {msg.text}
                              </Text>

                              <View style={styles.messageFooter}>
                                <Text
                                  style={[
                                    styles.messageTimeText,
                                    isMe ? styles.messageTimeTextMe : styles.messageTimeTextPartner,
                                  ]}
                                >
                                  {formatTime(msg.createdAt)}
                                </Text>
                                {isMe && (
                                  <CheckCheck size={12} color="rgba(255, 255, 255, 0.85)" />
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                {/* BARRA INFERIOR DE ENVIO DE MENSAGENS */}
                <View style={styles.inputBarContainer}>
                  {/* Atalhos de Emojis Românticos */}
                  <View style={styles.quickEmojiRow}>
                    {['❤️', '🥰', '💌', '🌹', '✨', '☕'].map((em, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setInputText((prev) => prev + em)}
                        style={styles.quickEmojiButton}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quickEmojiText}>{em}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.inputRow}>
                    <TextInput
                      value={inputText}
                      onChangeText={setInputText}
                      placeholder="Escreva uma cartinha de amor..."
                      placeholderTextColor="#ABA2B8"
                      style={styles.chatInput}
                      multiline
                      maxLength={500}
                    />

                    {/* Botão de Enviar estilizado */}
                    <TouchableOpacity
                      onPress={handleSend}
                      disabled={!inputText.trim() || isSending}
                      style={[
                        styles.sendButton,
                        (!inputText.trim() || isSending) && styles.sendButtonDisabled,
                      ]}
                      activeOpacity={0.8}
                      accessibilityLabel="Enviar carta de amor"
                    >
                      {isSending ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Send size={16} color="#FFFFFF" strokeWidth={2.5} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.modalBackdrop,
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderWidth: 1,
    borderColor: 'rgba(234, 230, 225, 0.7)',
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 20,
    height: '92%',
    maxHeight: '92%',
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD9D2',
    alignSelf: 'center',
    marginBottom: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3EF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 2,
    fontFamily:
      Platform.OS === 'ios'
        ? 'Didot'
        : Platform.OS === 'web'
        ? '"Didot", "Bodoni MT", "Playfair Display", Georgia, serif'
        : 'serif',
  },
  subtitle: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },

  // Alternador de remetente
  senderPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  senderPickerLabel: {
    fontSize: 11,
    color: '#7C728E',
    fontWeight: '600',
  },
  senderPillGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  senderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F4F1EA',
    paddingVertical: 3.5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6E1D7',
  },
  senderPillActive: {
    backgroundColor: 'rgba(198, 139, 89, 0.16)',
    borderColor: COLORS.accent,
  },
  senderPillText: {
    fontSize: 11,
    color: '#6F657D',
    fontWeight: '500',
  },
  senderPillTextActive: {
    color: COLORS.accentDark,
    fontWeight: '700',
  },

  // Contêiner de mensagens
  messagesContainer: {
    flex: 1,
    backgroundColor: '#FAF9F7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ECE7DF',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#847A94',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(198, 139, 89, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.22)',
    marginBottom: 10,
    position: 'relative',
  },
  emptyHeartBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#28173B',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: '#847A94',
    textAlign: 'center',
    lineHeight: 16,
  },
  messagesScrollContent: {
    paddingVertical: 6,
    gap: 8,
  },

  // Balões de Mensagem
  messageRow: {
    flexDirection: 'row',
    width: '100%',
    marginVertical: 2,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowPartner: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  messageBubbleMe: {
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 4,
  },
  messageBubblePartner: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#EDE9E2',
  },
  messageSenderName: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  messageSenderNameMe: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'right',
  },
  messageSenderNamePartner: {
    color: COLORS.accentDark,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  messageTextMe: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  messageTextPartner: {
    color: '#2D2D2D',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  messageTimeText: {
    fontSize: 9.5,
  },
  messageTimeTextMe: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messageTimeTextPartner: {
    color: '#9C94AA',
  },

  // Barra de Envio
  inputBarContainer: {
    backgroundColor: '#FAF9F7',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ECE7DF',
  },
  quickEmojiRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  quickEmojiButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  quickEmojiText: {
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4DFD7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#2D2D2D',
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2,
  },
  sendButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
});
