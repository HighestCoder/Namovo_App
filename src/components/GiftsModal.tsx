import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Linking,
} from 'react-native';
import {
  Gift,
  ExternalLink,
  Plus,
  Trash2,
  X,
  Sparkles,
  Check,
  FileText,
  Heart,
  Globe,
  Tag,
  ShoppingBag,
  Info,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { GiftIdea } from '../types';
import {
  subscribeToGifts,
  saveGiftsToFirestore,
} from '../services/firebase';
import { triggerNewGiftNotification } from '../services/notifications';
import { triggerSuccessHaptic, triggerSelectionHaptic } from '../utils/haptics';

interface GiftsModalProps {
  visible: boolean;
  onClose: () => void;
  partner1Name?: string;
  partner2Name?: string;
}

const INITIAL_GIFTS: GiftIdea[] = [
  {
    id: 'gift-1',
    name: 'Perfume Signature & Vela Aromática',
    link: 'https://sephora.com.br',
    notes: 'Fragrância floral amadeirada com notas de baunilha. Tamanho: 100ml.',
    isPurchased: false,
    createdAt: Date.now() - 200000,
  },
  {
    id: 'gift-2',
    name: 'Casaco de Lã Bege Cashmere',
    link: 'https://zara.com',
    notes: 'Tamanho M. Edição de inverno com corte elegante e toque macio.',
    isPurchased: false,
    createdAt: Date.now() - 100000,
  },
];

// Utilitário para extrair nome amigável do domínio da URL
const extractDomain = (rawUrl?: string): string => {
  if (!rawUrl) return '';
  try {
    const clean = rawUrl
      .trim()
      .replace(/^(?:https?:\/\/)?(?:www\.)?/i, '')
      .split('/')[0]
      .split('?')[0];
    return clean || 'Ver link';
  } catch {
    return 'Link externo';
  }
};

export const GiftsModal: React.FC<GiftsModalProps> = ({
  visible,
  onClose,
  partner1Name,
  partner2Name,
}) => {
  const [gifts, setGifts] = useState<GiftIdea[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'p1' | 'p2' | 'purchased'>('all');

  // Estados dos 3 inputs do formulário
  const [giftName, setGiftName] = useState('');
  const [purchaseLink, setPurchaseLink] = useState('');
  const [notes, setNotes] = useState('');
  const [targetPartner, setTargetPartner] = useState<string>('all');
  const [formError, setFormError] = useState<string>('');

  // Controle de foco para bordas dinâmicas sofisticadas
  const [focusedField, setFocusedField] = useState<'name' | 'link' | 'notes' | null>(null);

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(350)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  // Sincronização em tempo real (onSnapshot) da lista de presentes no Firestore
  useEffect(() => {
    let seeded = false;
    const unsubscribe = subscribeToGifts((remoteGifts) => {
      if (remoteGifts && remoteGifts.length > 0) {
        setGifts(remoteGifts);
      } else if (!seeded) {
        seeded = true;
        setGifts(INITIAL_GIFTS);
        saveGiftsToFirestore(INITIAL_GIFTS);
      } else {
        setGifts([]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Salva no Firestore (sincronizando ambos os dispositivos em tempo real)
  const persistGifts = useCallback(async (updated: GiftIdea[]) => {
    setGifts(updated);
    await saveGiftsToFirestore(updated);
  }, []);

  const resetForm = useCallback(() => {
    setGiftName('');
    setPurchaseLink('');
    setNotes('');
    setTargetPartner('all');
    setFormError('');
    setFocusedField(null);
  }, []);

  // Transições de entrada/saída do modal
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 240,
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
      fadeAnim.setValue(0);
      slideAnim.setValue(350);
      setIsAdding(false);
      resetForm();
    }
  }, [visible, fadeAnim, slideAnim, resetForm]);

  // Transição suave ao abrir/fechar o formulário de cadastro
  useEffect(() => {
    if (isAdding) {
      Animated.spring(formAnim, {
        toValue: 1,
        tension: 70,
        friction: 9,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(formAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [isAdding, formAnim]);

  const handleClose = () => {
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

  // Salvar novo presente com validação e sanitização estrita
  const handleSaveGift = () => {
    const trimmedName = giftName.trim();
    if (!trimmedName) {
      setFormError('Por favor, informe o nome do presente.');
      return;
    }

    // Higienização do link
    let sanitizedLink = purchaseLink.trim();
    if (sanitizedLink) {
      // Se não contiver protocolo http:// ou https://, acrescenta https://
      if (!/^https?:\/\//i.test(sanitizedLink)) {
        sanitizedLink = `https://${sanitizedLink}`;
      }
    }

    const newGift: GiftIdea = {
      id: `gift-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      link: sanitizedLink || undefined,
      notes: notes.trim() || undefined,
      forPartner: targetPartner !== 'all' ? targetPartner : undefined,
      isPurchased: false,
      createdAt: Date.now(),
    };

    const updated = [newGift, ...gifts];
    persistGifts(updated);
    triggerSuccessHaptic();

    // Dispara notificação sutil local de presente salvo
    triggerNewGiftNotification(newGift.name, newGift.forPartner);

    resetForm();
    setIsAdding(false);
  };

  // Alternar status de comprado/realizado
  const handleTogglePurchased = (id: string) => {
    triggerSelectionHaptic();
    const updated = gifts.map((item) =>
      item.id === id ? { ...item, isPurchased: !item.isPurchased } : item
    );
    persistGifts(updated);
  };

  // Remover ideia com confirmação
  const handleDeleteGift = (id: string, name: string) => {
    const confirmDelete = () => {
      const updated = gifts.filter((item) => item.id !== id);
      persistGifts(updated);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Deseja remover "${name}" da lista de presentes?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Remover Ideia',
        `Tem certeza que deseja apagar "${name}" da lista de desejos?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Remover', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  // Abertura segura de links com fallback
  const handleOpenLink = async (rawUrl?: string) => {
    if (!rawUrl) return;

    let targetUrl = rawUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      if (Platform.OS === 'web') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      } else {
        Alert.alert('Link inacessível', 'Não foi possível carregar a URL deste produto.');
      }
    } catch {
      if (Platform.OS === 'web') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        Alert.alert('Erro ao abrir link', 'Verifique o endereço digitado e tente novamente.');
      }
    }
  };

  // Filtragem dos itens exibidos
  const filteredGifts = useMemo(() => {
    if (activeFilter === 'purchased') {
      return gifts.filter((g) => g.isPurchased);
    }
    if (activeFilter === 'p1' && partner1Name) {
      return gifts.filter((g) => g.forPartner === partner1Name);
    }
    if (activeFilter === 'p2' && partner2Name) {
      return gifts.filter((g) => g.forPartner === partner2Name);
    }
    return gifts;
  }, [gifts, activeFilter, partner1Name, partner2Name]);

  const purchasedCount = useMemo(() => gifts.filter((g) => g.isPurchased).length, [gifts]);

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
                {/* Grabber e Botão Fechar */}
                <View style={styles.grabber} />
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                  accessibilityLabel="Fechar Lista de Presentes"
                >
                  <X size={18} color="#6B6864" strokeWidth={2.2} />
                </TouchableOpacity>

                <ScrollView
                  style={styles.scrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Cabeçalho */}
                  <View style={styles.header}>
                    <View style={styles.badgeWrapper}>
                      <Gift size={13} color={COLORS.accent} strokeWidth={2.4} />
                      <Text style={styles.badgeText}>LISTA DE DESEJOS & PRESENTES</Text>
                    </View>
                    <Text style={styles.title}>Ideias de Presentes a Dois</Text>
                    <Text style={styles.subtitle}>
                      Anote mimos, tamanhos, cores e links para surpreender quem você ama em qualquer ocasião especial.
                    </Text>
                  </View>

                  {/* Barra de Ações & Contador de Ideias */}
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {gifts.length} {gifts.length === 1 ? 'ideia guardada' : 'ideias guardadas'}
                        {purchasedCount > 0 ? ` • ${purchasedCount} conquistado(s)` : ''}
                      </Text>
                    </View>

                    {!isAdding ? (
                      <TouchableOpacity
                        onPress={() => {
                          resetForm();
                          setIsAdding(true);
                        }}
                        style={styles.addGiftButton}
                        activeOpacity={0.8}
                      >
                        <Plus size={15} color="#FFFFFF" strokeWidth={2.6} />
                        <Text style={styles.addGiftButtonText}>Nova Ideia</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* FILTROS RÁPIDOS POR DESTINATÁRIO / STATUS */}
                  {gifts.length > 0 && (
                    <View style={styles.filterBar}>
                      <TouchableOpacity
                        onPress={() => setActiveFilter('all')}
                        style={[
                          styles.filterPill,
                          activeFilter === 'all' && styles.filterPillActive,
                        ]}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            activeFilter === 'all' && styles.filterPillTextActive,
                          ]}
                        >
                          Todos ({gifts.length})
                        </Text>
                      </TouchableOpacity>

                      {partner1Name ? (
                        <TouchableOpacity
                          onPress={() => setActiveFilter('p1')}
                          style={[
                            styles.filterPill,
                            activeFilter === 'p1' && styles.filterPillActive,
                          ]}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              activeFilter === 'p1' && styles.filterPillTextActive,
                            ]}
                          >
                            Para {partner1Name}
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      {partner2Name ? (
                        <TouchableOpacity
                          onPress={() => setActiveFilter('p2')}
                          style={[
                            styles.filterPill,
                            activeFilter === 'p2' && styles.filterPillActive,
                          ]}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              activeFilter === 'p2' && styles.filterPillTextActive,
                            ]}
                          >
                            Para {partner2Name}
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      {purchasedCount > 0 ? (
                        <TouchableOpacity
                          onPress={() => setActiveFilter('purchased')}
                          style={[
                            styles.filterPill,
                            activeFilter === 'purchased' && styles.filterPillActive,
                          ]}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.filterPillText,
                              activeFilter === 'purchased' && styles.filterPillTextActive,
                            ]}
                          >
                            Comprados ✨
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}

                  {/* ========================================================= */}
                  {/* FORMULÁRIO COM OS 3 CAMPOS ESPECÍFICOS                    */}
                  {/* ========================================================= */}
                  {isAdding && (
                    <Animated.View
                      style={[
                        styles.formContainer,
                        {
                          opacity: formAnim,
                          transform: [
                            {
                              scale: formAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.96, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <View style={styles.formHeaderRow}>
                        <View style={styles.formIconBadge}>
                          <Gift size={16} color={COLORS.accent} strokeWidth={2.2} />
                        </View>
                        <View>
                          <Text style={styles.formTitle}>Cadastrar Ideia de Presente</Text>
                          <Text style={styles.formSubtitle}>Preencha os detalhes do mimo especial</Text>
                        </View>
                      </View>

                      {/* Mensagem de Erro de Validação */}
                      {formError ? (
                        <View style={styles.errorAlertBox}>
                          <Info size={13} color="#C85A54" />
                          <Text style={styles.errorAlertText}>{formError}</Text>
                        </View>
                      ) : null}

                      {/* 1. Nome do Presente (Text Input) */}
                      <Text style={styles.inputLabel}>Nome do Presente *</Text>
                      <View
                        style={[
                          styles.inputBoxWrapper,
                          focusedField === 'name' && styles.inputBoxWrapperFocused,
                          Boolean(formError) && styles.inputBoxWrapperError,
                        ]}
                      >
                        <Gift
                          size={15}
                          color={focusedField === 'name' ? COLORS.accent : '#9E94AD'}
                          style={styles.fieldIcon}
                        />
                        <TextInput
                          value={giftName}
                          onChangeText={(text) => {
                            setGiftName(text);
                            if (formError) setFormError('');
                          }}
                          onFocus={() => setFocusedField('name')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Ex: Perfume Signature, Livro clássico, Relógio..."
                          placeholderTextColor="#ABA2B8"
                          style={styles.textInput}
                        />
                      </View>

                      {/* 2. Link de Compra (URL Input) */}
                      <Text style={styles.inputLabel}>Link de Compra (URL)</Text>
                      <View
                        style={[
                          styles.inputBoxWrapper,
                          focusedField === 'link' && styles.inputBoxWrapperFocused,
                        ]}
                      >
                        <Globe
                          size={15}
                          color={focusedField === 'link' ? COLORS.accent : '#9E94AD'}
                          style={styles.fieldIcon}
                        />
                        <TextInput
                          value={purchaseLink}
                          onChangeText={setPurchaseLink}
                          onFocus={() => setFocusedField('link')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Ex: sephora.com.br/produto ou https://..."
                          placeholderTextColor="#ABA2B8"
                          style={styles.textInput}
                          keyboardType="url"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>

                      {/* 3. Anotações & Especificações (Multiline Text Area) */}
                      <Text style={styles.inputLabel}>Anotações & Especificações</Text>
                      <View
                        style={[
                          styles.inputBoxWrapper,
                          styles.textAreaWrapper,
                          focusedField === 'notes' && styles.inputBoxWrapperFocused,
                        ]}
                      >
                        <FileText
                          size={15}
                          color={focusedField === 'notes' ? COLORS.accent : '#9E94AD'}
                          style={[styles.fieldIcon, { marginTop: 4 }]}
                        />
                        <TextInput
                          value={notes}
                          onChangeText={setNotes}
                          onFocus={() => setFocusedField('notes')}
                          onBlur={() => setFocusedField(null)}
                          placeholder="Ex: Tamanho M, cor bege/nude, edição comemorativa, loja física no shopping..."
                          placeholderTextColor="#ABA2B8"
                          style={[styles.textInput, styles.textAreaInput]}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                        />
                      </View>

                      {/* Seletor Romântico de Destinatário */}
                      {partner1Name && partner2Name ? (
                        <View style={styles.partnerPickerRow}>
                          <Text style={styles.partnerPickerLabel}>Para quem é este presente?</Text>
                          <View style={styles.partnerPillGroup}>
                            <TouchableOpacity
                              onPress={() => setTargetPartner('all')}
                              style={[
                                styles.partnerPill,
                                targetPartner === 'all' && styles.partnerPillActive,
                              ]}
                              activeOpacity={0.75}
                            >
                              <Text
                                style={[
                                  styles.partnerPillText,
                                  targetPartner === 'all' && styles.partnerPillTextActive,
                                ]}
                              >
                                Nós dois ✨
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => setTargetPartner(partner1Name)}
                              style={[
                                styles.partnerPill,
                                targetPartner === partner1Name && styles.partnerPillActive,
                              ]}
                              activeOpacity={0.75}
                            >
                              <Text
                                style={[
                                  styles.partnerPillText,
                                  targetPartner === partner1Name && styles.partnerPillTextActive,
                                ]}
                              >
                                {partner1Name}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => setTargetPartner(partner2Name)}
                              style={[
                                styles.partnerPill,
                                targetPartner === partner2Name && styles.partnerPillActive,
                              ]}
                              activeOpacity={0.75}
                            >
                              <Text
                                style={[
                                  styles.partnerPillText,
                                  targetPartner === partner2Name && styles.partnerPillTextActive,
                                ]}
                              >
                                {partner2Name}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null}

                      {/* Botões de Ação do Formulário */}
                      <View style={styles.formActionRow}>
                        <TouchableOpacity
                          onPress={() => {
                            resetForm();
                            setIsAdding(false);
                          }}
                          style={styles.cancelButton}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleSaveGift}
                          style={styles.saveButton}
                          activeOpacity={0.8}
                        >
                          <Check size={16} color="#FFFFFF" strokeWidth={2.4} />
                          <Text style={styles.saveButtonText}>Salvar Ideia</Text>
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                  )}

                  {/* ========================================================= */}
                  {/* LIST VIEW DE PRESENTES SALVOS                             */}
                  {/* ========================================================= */}
                  <View style={styles.listContainer}>
                    {filteredGifts.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                          <ShoppingBag size={28} color={COLORS.accent} strokeWidth={1.8} />
                          <Sparkles
                            size={14}
                            color={COLORS.accentDark}
                            style={styles.emptySparkle}
                          />
                        </View>
                        <Text style={styles.emptyTitle}>
                          {activeFilter === 'all'
                            ? 'Sua lista de presentes está vazia'
                            : 'Nenhum item encontrado neste filtro'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                          {activeFilter === 'all'
                            ? 'Surpreenda quem você ama — guarde ideias de presentes, tamanhos de roupas e desejos especiais para aniversários e datas marcantes.'
                            : 'Alterne os filtros acima ou cadastre uma nova ideia para esta categoria.'}
                        </Text>

                        {!isAdding && (
                          <TouchableOpacity
                            onPress={() => {
                              resetForm();
                              setIsAdding(true);
                            }}
                            style={styles.emptyAddButton}
                            activeOpacity={0.8}
                          >
                            <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.emptyAddButtonText}>
                              Cadastrar Primeira Ideia de Presente
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      filteredGifts.map((item) => {
                        const domainName = extractDomain(item.link);

                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.giftCard,
                              item.isPurchased && styles.giftCardPurchased,
                            ]}
                          >
                            <View style={styles.giftCardTop}>
                              {/* Ícone de presente / Checkbox de Comprado */}
                              <TouchableOpacity
                                onPress={() => handleTogglePurchased(item.id)}
                                style={[
                                  styles.giftIconCircle,
                                  item.isPurchased && styles.giftIconCirclePurchased,
                                ]}
                                activeOpacity={0.75}
                                accessibilityLabel={
                                  item.isPurchased
                                    ? 'Marcar como não adquirido'
                                    : 'Marcar como adquirido'
                                }
                              >
                                {item.isPurchased ? (
                                  <Check size={18} color="#FFFFFF" strokeWidth={2.8} />
                                ) : (
                                  <Gift size={18} color={COLORS.accent} strokeWidth={2} />
                                )}
                              </TouchableOpacity>

                              {/* Informações Principais */}
                              <View style={styles.giftMainInfo}>
                                <Text
                                  style={[
                                    styles.giftNameText,
                                    item.isPurchased && styles.giftNameTextPurchased,
                                  ]}
                                  numberOfLines={2}
                                >
                                  {item.name}
                                </Text>

                                <View style={styles.tagsRow}>
                                  {item.forPartner ? (
                                    <View style={styles.recipientPill}>
                                      <Heart size={10} color={COLORS.accentDark} />
                                      <Text style={styles.recipientPillText}>
                                        Para {item.forPartner}
                                      </Text>
                                    </View>
                                  ) : null}

                                  {domainName ? (
                                    <View style={styles.domainBadge}>
                                      <Tag size={10} color="#7E7292" />
                                      <Text style={styles.domainBadgeText}>
                                        {domainName}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                              </View>

                              {/* Botão de Excluir */}
                              <TouchableOpacity
                                onPress={() => handleDeleteGift(item.id, item.name)}
                                style={styles.deleteButton}
                                activeOpacity={0.7}
                                accessibilityLabel={`Remover ideia ${item.name}`}
                              >
                                <Trash2 size={15} color="#C85A54" strokeWidth={2} />
                              </TouchableOpacity>
                            </View>

                            {/* Anotações / Especificações (Tamanho, Cor, etc.) */}
                            {item.notes ? (
                              <View style={styles.notesContainer}>
                                <FileText
                                  size={13}
                                  color="#847A94"
                                  style={{ marginTop: 2, marginRight: 6 }}
                                />
                                <Text style={styles.notesText}>{item.notes}</Text>
                              </View>
                            ) : null}

                            {/* Rodapé do Card: Botão de Link de Compra & Status */}
                            <View style={styles.giftFooterRow}>
                              {item.link ? (
                                <TouchableOpacity
                                  onPress={() => handleOpenLink(item.link)}
                                  style={styles.purchaseLinkButton}
                                  activeOpacity={0.75}
                                  accessibilityLabel={`Abrir link de ${item.name}`}
                                >
                                  <ExternalLink
                                    size={12.5}
                                    color={COLORS.accentDark}
                                    strokeWidth={2.2}
                                  />
                                  <Text style={styles.purchaseLinkText} numberOfLines={1}>
                                    Abrir loja ({domainName || 'Link'})
                                  </Text>
                                </TouchableOpacity>
                              ) : (
                                <View style={{ height: 1 }} />
                              )}

                              <TouchableOpacity
                                onPress={() => handleTogglePurchased(item.id)}
                                style={[
                                  styles.statusPill,
                                  item.isPurchased && styles.statusPillPurchased,
                                ]}
                                activeOpacity={0.75}
                              >
                                <Text
                                  style={[
                                    styles.statusPillText,
                                    item.isPurchased && styles.statusPillTextPurchased,
                                  ]}
                                >
                                  {item.isPurchased ? 'Conquistado ✨' : 'Na Wishlist 🎁'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </ScrollView>
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
    paddingHorizontal: 20,
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
  scrollView: {
    flex: 1,
    width: '100%',
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD9D2',
    alignSelf: 'center',
    marginBottom: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F3EF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    paddingVertical: 4.5,
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
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
    fontFamily:
      Platform.OS === 'ios'
        ? 'Didot'
        : Platform.OS === 'web'
        ? '"Didot", "Bodoni MT", "Playfair Display", Georgia, serif'
        : 'serif',
  },
  subtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },

  // Linha de ações da seção
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: '#F8F6F2',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEBE4',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6F6380',
  },
  addGiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accent,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 14,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  addGiftButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Filtros rápidos
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  filterPill: {
    paddingVertical: 4.5,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: '#F5F3EF',
    borderWidth: 1,
    borderColor: '#ECE7DF',
  },
  filterPillActive: {
    backgroundColor: 'rgba(198, 139, 89, 0.14)',
    borderColor: COLORS.accent,
  },
  filterPillText: {
    fontSize: 11,
    color: '#706780',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: COLORS.accentDark,
    fontWeight: '700',
  },

  // Formulário
  formContainer: {
    backgroundColor: '#FAF9F7',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE7DF',
    marginBottom: 18,
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  formIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(198, 139, 89, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#28173B',
  },
  formSubtitle: {
    fontSize: 11,
    color: '#847A94',
    marginTop: 1,
  },
  errorAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF2F2',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F5C6C6',
  },
  errorAlertText: {
    fontSize: 11.5,
    color: '#C85A54',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#554A66',
    marginBottom: 5,
  },
  inputBoxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4DFD7',
    paddingHorizontal: 12,
    marginBottom: 11,
  },
  inputBoxWrapperFocused: {
    borderColor: COLORS.accent,
    backgroundColor: '#FFFDFB',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  inputBoxWrapperError: {
    borderColor: '#C85A54',
  },
  fieldIcon: {
    marginRight: 8,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: '#2D2D2D',
  },
  textAreaInput: {
    minHeight: 64,
    paddingTop: 2,
  },

  // Seleção de destinatário
  partnerPickerRow: {
    marginTop: 2,
    marginBottom: 14,
  },
  partnerPickerLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#554A66',
    marginBottom: 6,
  },
  partnerPillGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  partnerPill: {
    paddingVertical: 5.5,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2DDD4',
  },
  partnerPillActive: {
    backgroundColor: 'rgba(198, 139, 89, 0.16)',
    borderColor: COLORS.accent,
  },
  partnerPillText: {
    fontSize: 11,
    color: '#6E647E',
    fontWeight: '500',
  },
  partnerPillTextActive: {
    color: COLORS.accentDark,
    fontWeight: '700',
  },

  // Ações do formulário
  formActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelButton: {
    paddingVertical: 8.5,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#EFEBE4',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#70687C',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8.5,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  saveButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Lista de presentes
  listContainer: {
    gap: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: '#FAF9F7',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#ECE7DF',
    marginTop: 4,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(198, 139, 89, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  emptySparkle: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#28173B',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#847A94',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 290,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 14,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Card de presente
  giftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: '#EDE9E2',
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.045,
    shadowRadius: 10,
    elevation: 2,
  },
  giftCardPurchased: {
    backgroundColor: '#FAF9F7',
    borderColor: '#E4DFD5',
    opacity: 0.88,
  },
  giftCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  giftIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(198, 139, 89, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.25)',
  },
  giftIconCirclePurchased: {
    backgroundColor: '#5B8C6A',
    borderColor: '#5B8C6A',
  },
  giftMainInfo: {
    flex: 1,
  },
  giftNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#28173B',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  giftNameTextPurchased: {
    textDecorationLine: 'line-through',
    color: '#8C829B',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  recipientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(198, 139, 89, 0.10)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  recipientPillText: {
    fontSize: 10.5,
    color: COLORS.accentDark,
    fontWeight: '600',
  },
  domainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3EFE9',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 8,
  },
  domainBadgeText: {
    fontSize: 10.5,
    color: '#6F6382',
    fontWeight: '500',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Notas e especificações
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    backgroundColor: '#FAF9F7',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDE8E0',
  },
  notesText: {
    fontSize: 12,
    color: '#554A66',
    lineHeight: 17,
    flex: 1,
  },

  // Rodapé do card
  giftFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 11,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#F5F2EC',
  },
  purchaseLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(198, 139, 89, 0.10)',
    paddingVertical: 5.5,
    paddingHorizontal: 11,
    borderRadius: 11,
    maxWidth: '68%',
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.20)',
  },
  purchaseLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accentDark,
  },
  statusPill: {
    backgroundColor: '#F2EFEB',
    paddingVertical: 4.5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECE7DF',
  },
  statusPillPurchased: {
    backgroundColor: 'rgba(91, 140, 106, 0.12)',
    borderColor: 'rgba(91, 140, 106, 0.30)',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#6F657D',
  },
  statusPillTextPurchased: {
    color: '#467A55',
    fontWeight: '700',
  },
});
