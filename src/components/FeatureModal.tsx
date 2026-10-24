import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Flower2, X, Plus, Sparkles, Heart, Trash2, Calendar, Send } from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { ActiveCornerModal, CoupleMemory } from '../types';
import {
  subscribeToMemories,
  saveMemoriesToFirestore,
} from '../services/firebase';

interface FeatureModalProps {
  activeModal: ActiveCornerModal;
  onClose: () => void;
  onEditRequested?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const INITIAL_MEMORIES: CoupleMemory[] = [
  {
    id: '1',
    title: 'O Primeiro Olhar',
    content: 'Ainda me lembro do instante exato em que nossos caminhos se cruzaram. O mundo pareceu desacelerar e tudo fez sentido.',
    date: '2024-01-15',
    tag: 'Carta de Amor',
  },
  {
    id: '2',
    title: 'Nossa Promessa Secreta',
    content: 'Prometo estar com você em cada amanhecer e segurar sua mão quando o dia for difícil. Você é meu abrigo.',
    date: '2024-05-20',
    tag: 'Promessa',
  },
  {
    id: '3',
    title: 'Café & Gargalhadas',
    content: 'Aquele domingo despretensioso tomando café na chuva virou um dos dias mais doces da minha vida.',
    date: '2024-09-10',
    tag: 'Momento Especial',
  },
];

export const FeatureModal: React.FC<FeatureModalProps> = ({
  activeModal,
  onClose,
}) => {
  const [memories, setMemories] = useState<CoupleMemory[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedTag, setSelectedTag] = useState('Carta de Amor');

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Sincronização em tempo real (onSnapshot) das lembranças no Firestore
  useEffect(() => {
    let seeded = false;
    const unsubscribe = subscribeToMemories((remoteMemories) => {
      if (remoteMemories && remoteMemories.length > 0) {
        setMemories(remoteMemories);
      } else if (!seeded) {
        seeded = true;
        setMemories(INITIAL_MEMORIES);
        saveMemoriesToFirestore(INITIAL_MEMORIES);
      } else {
        setMemories([]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeModal === 'memories') {
      setIsAdding(false);
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
      ]).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
    }
  }, [activeModal, fadeAnim, slideAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleSaveMemory = async () => {
    const titleTrim = newTitle.trim();
    const contentTrim = newContent.trim();
    if (!titleTrim || !contentTrim) {
      Alert.alert('Campos Obrigatórios', 'Preencha o título e o texto da sua mensagem de amor.');
      return;
    }

    const newMemory: CoupleMemory = {
      id: Date.now().toString(),
      title: titleTrim,
      content: contentTrim,
      date: new Date().toISOString().split('T')[0],
      tag: selectedTag,
    };

    const updated = [newMemory, ...memories];
    setMemories(updated);
    await saveMemoriesToFirestore(updated);

    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
  };

  const handleDeleteMemory = async (id: string) => {
    const updated = memories.filter((m) => m.id !== id);
    setMemories(updated);
    await saveMemoriesToFirestore(updated);
  };

  if (activeModal !== 'memories') return null;

  return (
    <Modal
      transparent
      visible={activeModal === 'memories'}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalCard,
                { transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* Barra indicadora iOS */}
              <View style={styles.grabber} />

              {/* Botão Fechar discreto */}
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <X size={20} color={COLORS.textSecondary} strokeWidth={2} />
              </TouchableOpacity>

              {/* Cabeçalho */}
              <View style={styles.header}>
                <View style={styles.badgeWrapper}>
                  <Sparkles size={12} color={COLORS.accent} />
                  <Text style={styles.badgeText}>CARTAS & VOTOS</Text>
                </View>
                <Text style={styles.title}>Lembranças & Mensagens</Text>
                <Text style={styles.subtitle}>
                  Guarde cartas, declarações sinceras e momentos guardados no coração.
                </Text>
              </View>

              {/* Alternador / Botão de Nova Mensagem */}
              {!isAdding ? (
                <View style={styles.topActionsRow}>
                  <TouchableOpacity
                    onPress={() => setIsAdding(true)}
                    activeOpacity={0.85}
                    style={styles.newNoteBtn}
                  >
                    <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.newNoteBtnText}>Escrever Nova Mensagem</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Formulário de Nova Mensagem */}
              {isAdding ? (
                <View style={styles.formContainer}>
                  <View style={styles.formHeaderRow}>
                    <Text style={styles.formTitle}>Nova Mensagem de Amor</Text>
                    <TouchableOpacity
                      onPress={() => setIsAdding(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.cancelLinkText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    value={newTitle}
                    onChangeText={setNewTitle}
                    placeholder="Título (ex: Para sempre com você)"
                    placeholderTextColor={COLORS.textLight}
                    style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any)]}
                  />

                  <TextInput
                    value={newContent}
                    onChangeText={setNewContent}
                    placeholder="Escreva seus sentimentos e memórias aqui..."
                    placeholderTextColor={COLORS.textLight}
                    multiline
                    numberOfLines={4}
                    style={[styles.textArea, Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any)]}
                  />

                  {/* Seleção de Categoria */}
                  <View style={styles.tagsPicker}>
                    {['Carta de Amor', 'Promessa', 'Momento Especial'].map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setSelectedTag(t)}
                        style={[
                          styles.tagChoice,
                          selectedTag === t && styles.tagChoiceSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagChoiceText,
                            selectedTag === t && styles.tagChoiceTextSelected,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={handleSaveMemory}
                    activeOpacity={0.88}
                    style={styles.saveNoteBtn}
                  >
                    <Send size={16} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 6 }} />
                    <Text style={styles.saveNoteBtnText}>Guardar Mensagem</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Lista de Mensagens Guardadas */}
              <ScrollView
                style={styles.memoriesList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                {memories.map((memory) => (
                  <View key={memory.id} style={styles.memoryCard}>
                    <View style={styles.memoryCardHeader}>
                      <View style={styles.tagBadge}>
                        <Text style={styles.tagBadgeText}>{memory.tag || 'Lembrança'}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteMemory(memory.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={15} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.memoryTitle}>{memory.title}</Text>
                    <Text style={styles.memoryContent}>{memory.content}</Text>

                    <View style={styles.memoryFooter}>
                      <Calendar size={12} color={COLORS.accent} />
                      <Text style={styles.memoryDate}>{memory.date}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
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
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: 'rgba(234, 230, 225, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
    maxHeight: '88%',
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD9D2',
    alignSelf: 'center',
    marginBottom: 14,
  },
  closeButton: {
    position: 'absolute',
    top: 18,
    right: 22,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  topActionsRow: {
    marginBottom: 14,
  },
  newNoteBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  newNoteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: '#FAF8F5',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.25)',
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cancelLinkText: {
    fontSize: 12,
    color: COLORS.accentDark,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  tagsPicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tagChoice: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#EDE9E3',
  },
  tagChoiceSelected: {
    backgroundColor: COLORS.accent,
  },
  tagChoiceText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tagChoiceTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveNoteBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveNoteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  memoriesList: {
    maxHeight: 320,
  },
  memoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 230, 225, 0.95)',
    shadowColor: '#362248',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  memoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagBadge: {
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.accentDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  memoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  memoryContent: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  memoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memoryDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
