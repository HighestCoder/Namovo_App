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
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Sparkles,
  Clock,
  Heart,
  MapPin,
  Check,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import { CalendarEvent } from '../types';
import { scheduleCalendarReminder } from '../services/notifications';
import { triggerSuccessHaptic, triggerLightHaptic } from '../utils/haptics';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
}

const STORAGE_CALENDAR_KEY = '@namovo_calendar_events_v2';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PRESET_EMOJIS = [
  '❤️', '🍷', '🎬', '✈️', '🌹', '🍕', '🏖️', '☕',
  '💍', '🧁', '✨', '🎡', '🍣', '🌙', '🕯️', '🎉',
];

// Helper para formatar YYYY-MM-DD
const formatDateKey = (year: number, month: number, day: number): string => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

// Gera eventos iniciais inspiradores próximos à data atual
const getInitialEvents = (): CalendarEvent[] => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const event1Date = new Date(y, m, d + 3);
  const event2Date = new Date(y, m, d + 8);
  const event3Date = new Date(y, m, d + 15);

  return [
    {
      id: 'event-init-1',
      date: formatDateKey(event1Date.getFullYear(), event1Date.getMonth(), event1Date.getDate()),
      title: 'Jantar Romântico à Luz de Velas',
      emoji: '🍷',
      time: '20:30',
      note: 'Restaurante especial para nós dois',
      createdAt: Date.now() - 2000,
    },
    {
      id: 'event-init-2',
      date: formatDateKey(event2Date.getFullYear(), event2Date.getMonth(), event2Date.getDate()),
      title: 'Noite de Cinema & Aconchego',
      emoji: '🎬',
      time: '19:45',
      note: 'Com pipoca doce e chocolates favoritos',
      createdAt: Date.now() - 1000,
    },
    {
      id: 'event-init-3',
      date: formatDateKey(event3Date.getFullYear(), event3Date.getMonth(), event3Date.getDate()),
      title: 'Passeio ao Pôr do Sol',
      emoji: '✨',
      time: '17:30',
      note: 'Caminhada de mãos dadas',
      createdAt: Date.now(),
    },
  ];
};

export const CalendarModal: React.FC<CalendarModalProps> = ({ visible, onClose }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const today = new Date();
    return formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  });

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newEmoji, setNewEmoji] = useState<string>('🍷');
  const [newTime, setNewTime] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(350)).current;
  const formScaleAnim = useRef(new Animated.Value(1)).current;

  // Carrega eventos salvos no AsyncStorage
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_CALENDAR_KEY);
        if (stored) {
          const parsed: CalendarEvent[] = JSON.parse(stored);
          setEvents(parsed);
        } else {
          const initial = getInitialEvents();
          setEvents(initial);
          await AsyncStorage.setItem(STORAGE_CALENDAR_KEY, JSON.stringify(initial));
        }
      } catch (err) {
        console.warn('Erro ao carregar calendário:', err);
      }
    };
    loadEvents();
  }, []);

  // Salva no AsyncStorage sempre que os eventos mudarem
  const persistEvents = async (updatedList: CalendarEvent[]) => {
    setEvents(updatedList);
    try {
      await AsyncStorage.setItem(STORAGE_CALENDAR_KEY, JSON.stringify(updatedList));
    } catch (err) {
      console.warn('Erro ao salvar eventos do calendário:', err);
    }
  };

  // Animação de abertura / fechamento
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
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(350);
      setIsAddingEvent(false);
    }
  }, [visible, fadeAnim, slideAnim]);

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

  // Navegação de mês
  const handlePrevMonth = () => {
    triggerLightHaptic();
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    triggerLightHaptic();
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleJumpToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  // Cálculo da grade do calendário
  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Dom) a 6 (Sáb)
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dayNumber: number | null; dateKey: string | null }[] = [];

    // Células vazias antes do primeiro dia
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, dateKey: null });
    }

    // Dias do mês
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        dayNumber: d,
        dateKey: formatDateKey(year, month, d),
      });
    }

    return days;
  }, [currentDate]);

  // Mapa de eventos por dateKey para acesso rápido
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [events]);

  // Eventos do dia selecionado
  const selectedDayEvents = eventsByDate.get(selectedDateKey) || [];

  // Próximos eventos (ordenados cronologicamente)
  const upcomingEvents = useMemo(() => {
    const todayKey = formatDateKey(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate()
    );
    return [...events]
      .filter((ev) => ev.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  // Adicionar novo evento ao dia selecionado
  const handleSaveEvent = () => {
    if (!newTitle.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Por favor, informe o título do encontro ou compromisso.');
      } else {
        Alert.alert('Título obrigatório', 'Dê um nome especial ao seu encontro!');
      }
      return;
    }

    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: selectedDateKey,
      title: newTitle.trim(),
      emoji: newEmoji.trim() || '✨',
      time: newTime.trim() || undefined,
      note: newNote.trim() || undefined,
      createdAt: Date.now(),
    };

    const updated = [newEvent, ...events];
    persistEvents(updated);
    triggerSuccessHaptic();

    // Agenda notificação local e dispara alerta de confirmação
    scheduleCalendarReminder(newEvent.title, newEvent.date, newEvent.time, newEvent.emoji);

    // Limpa formulário
    setNewTitle('');
    setNewTime('');
    setNewNote('');
    setIsAddingEvent(false);
  };

  // Excluir evento
  const handleDeleteEvent = (id: string) => {
    const confirmDelete = () => {
      const updated = events.filter((ev) => ev.id !== id);
      persistEvents(updated);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Deseja remover este compromisso do calendário?')) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Remover Encontro',
        'Tem certeza que deseja apagar este momento marcado?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Remover', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  // Formata a data selecionada por extenso
  const formatSelectedDateTitle = (dateKey: string) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekday = WEEKDAY_NAMES[dateObj.getDay()];
    const monthName = MONTH_NAMES[m - 1];
    return `${weekday}, ${d} de ${monthName}`;
  };

  // Cálculo de dias até a data
  const getDaysUntil = (dateKey: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = dateKey.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'É Hoje! 🎉';
    if (diffDays === 1) return 'Amanhã! ✨';
    if (diffDays > 1) return `Em ${diffDays} dias 🥰`;
    if (diffDays === -1) return 'Ontem';
    return `Há ${Math.abs(diffDays)} dias`;
  };

  const todayKey = formatDateKey(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  );

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
                {/* Grabber e Fechar */}
                <View style={styles.grabber} />
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                  accessibilityLabel="Fechar Calendário"
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
                      <CalendarHeart size={13} color={COLORS.accent} strokeWidth={2.4} />
                      <Text style={styles.badgeText}>NOSSO CALENDÁRIO & ENCONTROS</Text>
                    </View>
                    <Text style={styles.title}>Datas Especiais a Dois</Text>
                    <Text style={styles.subtitle}>
                      Marque encontros, viagens e momentos inesquecíveis com emojis personalizados.
                    </Text>
                  </View>

                  {/* Barra do Mês / Navegação */}
                  <View style={styles.monthHeaderRow}>
                    <TouchableOpacity
                      onPress={handlePrevMonth}
                      style={styles.monthNavButton}
                      activeOpacity={0.7}
                      accessibilityLabel="Mês anterior"
                    >
                      <ChevronLeft size={20} color={COLORS.textPrimary} />
                    </TouchableOpacity>

                    <View style={styles.monthTitleWrapper}>
                      <Text style={styles.monthTitleText}>
                        {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                      </Text>
                      {currentDate.getMonth() !== new Date().getMonth() ||
                      currentDate.getFullYear() !== new Date().getFullYear() ? (
                        <TouchableOpacity
                          onPress={handleJumpToday}
                          style={styles.jumpTodayBadge}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.jumpTodayText}>Hoje</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      onPress={handleNextMonth}
                      style={styles.monthNavButton}
                      activeOpacity={0.7}
                      accessibilityLabel="Próximo mês"
                    >
                      <ChevronRight size={20} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  {/* Dias da Semana */}
                  <View style={styles.weekdaysRow}>
                    {WEEKDAY_NAMES.map((w, idx) => (
                      <Text
                        key={idx}
                        style={[
                          styles.weekdayText,
                          idx === 0 || idx === 6 ? styles.weekendText : null,
                        ]}
                      >
                        {w}
                      </Text>
                    ))}
                  </View>

                  {/* Grade de Dias do Calendário */}
                  <View style={styles.calendarGrid}>
                    {calendarGrid.map((cell, idx) => {
                      if (!cell.dayNumber || !cell.dateKey) {
                        return <View key={`blank-${idx}`} style={styles.dayCellEmpty} />;
                      }

                      const dateKey = cell.dateKey;
                      const isToday = dateKey === todayKey;
                      const isSelected = dateKey === selectedDateKey;
                      const dayEvents = eventsByDate.get(dateKey) || [];
                      const hasEvent = dayEvents.length > 0;
                      const primaryEmoji = hasEvent ? dayEvents[0].emoji : null;

                      return (
                        <TouchableOpacity
                          key={dateKey}
                          onPress={() => {
                            setSelectedDateKey(dateKey);
                            setIsAddingEvent(false);
                          }}
                          activeOpacity={0.75}
                          style={[
                            styles.dayCell,
                            isSelected && styles.dayCellSelected,
                            isToday && !isSelected && styles.dayCellToday,
                          ]}
                          accessibilityLabel={`Dia ${cell.dayNumber}`}
                        >
                          {/* Número do Dia */}
                          <Text
                            style={[
                              styles.dayNumberText,
                              isSelected && styles.dayNumberTextSelected,
                              isToday && !isSelected && styles.dayNumberTextToday,
                            ]}
                          >
                            {cell.dayNumber}
                          </Text>

                          {/* Emoji do Evento Marcado no Grid */}
                          {hasEvent && primaryEmoji ? (
                            <View style={styles.dayEmojiBadge}>
                              <Text style={styles.dayEmojiText}>{primaryEmoji}</Text>
                            </View>
                          ) : (
                            <View style={styles.dayEmojiPlaceholder} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* ========================================================= */}
                  {/* DETALHES DO DIA SELECIONADO                              */}
                  {/* ========================================================= */}
                  <View style={styles.selectedDateCard}>
                    <View style={styles.selectedDateHeader}>
                      <View>
                        <Text style={styles.selectedDateTitle}>
                          {formatSelectedDateTitle(selectedDateKey)}
                        </Text>
                        <Text style={styles.selectedDateCountdown}>
                          {getDaysUntil(selectedDateKey)}
                        </Text>
                      </View>

                      {!isAddingEvent && (
                        <TouchableOpacity
                          onPress={() => setIsAddingEvent(true)}
                          style={styles.addEventButton}
                          activeOpacity={0.8}
                        >
                          <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
                          <Text style={styles.addEventButtonText}>Marcar</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Formulário para Adicionar Encontro / Compromisso */}
                    {isAddingEvent ? (
                      <View style={styles.formContainer}>
                        <Text style={styles.formSectionTitle}>
                          Escolha o Emoji do Momento:
                        </Text>

                        {/* Seletor de Emojis Rápidos */}
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.emojiList}
                        >
                          {PRESET_EMOJIS.map((em, idx) => (
                            <TouchableOpacity
                              key={idx}
                              onPress={() => setNewEmoji(em)}
                              style={[
                                styles.emojiButton,
                                newEmoji === em && styles.emojiButtonActive,
                              ]}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.emojiButtonText}>{em}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>

                        {/* Emoji personalizado (digitar qualquer emoji) */}
                        <View style={styles.customEmojiRow}>
                          <Text style={styles.customEmojiLabel}>Emoji Atual:</Text>
                          <View style={styles.customEmojiInputWrapper}>
                            <TextInput
                              value={newEmoji}
                              onChangeText={setNewEmoji}
                              style={styles.customEmojiInput}
                              maxLength={3}
                              placeholder="✨"
                            />
                          </View>
                          <Text style={styles.customEmojiHint}>
                            (Toque para digitar outro emoji do seu teclado)
                          </Text>
                        </View>

                        {/* Título do Evento */}
                        <Text style={styles.inputLabel}>Título do Encontro:</Text>
                        <TextInput
                          value={newTitle}
                          onChangeText={setNewTitle}
                          placeholder="Ex: Jantar à Luz de Velas, Noite de Cinema..."
                          placeholderTextColor="#ABA2B8"
                          style={styles.textInput}
                        />

                        {/* Horário */}
                        <Text style={styles.inputLabel}>Horário (opcional):</Text>
                        <TextInput
                          value={newTime}
                          onChangeText={setNewTime}
                          placeholder="Ex: 20:30"
                          placeholderTextColor="#ABA2B8"
                          style={styles.textInput}
                        />

                        {/* Observações / Local */}
                        <Text style={styles.inputLabel}>Local / Detalhe romântico (opcional):</Text>
                        <TextInput
                          value={newNote}
                          onChangeText={setNewNote}
                          placeholder="Ex: No nosso restaurante preferido"
                          placeholderTextColor="#ABA2B8"
                          style={styles.textInput}
                        />

                        {/* Botões do Formulário */}
                        <View style={styles.formActionRow}>
                          <TouchableOpacity
                            onPress={() => setIsAddingEvent(false)}
                            style={styles.cancelFormButton}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.cancelFormButtonText}>Cancelar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={handleSaveEvent}
                            style={styles.submitFormButton}
                            activeOpacity={0.8}
                          >
                            <Check size={16} color="#FFFFFF" strokeWidth={2.4} />
                            <Text style={styles.submitFormButtonText}>Salvar Encontro</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      /* Lista de eventos do dia */
                      <View style={styles.dayEventsList}>
                        {selectedDayEvents.length === 0 ? (
                          <View style={styles.emptyDayContainer}>
                            <Text style={styles.emptyDayEmoji}>🕊️</Text>
                            <Text style={styles.emptyDayText}>
                              Nenhum compromisso marcado para este dia ainda.
                            </Text>
                            <TouchableOpacity
                              onPress={() => setIsAddingEvent(true)}
                              style={styles.emptyAddButton}
                              activeOpacity={0.75}
                            >
                              <Text style={styles.emptyAddButtonText}>
                                + Planejar um momento a dois neste dia
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          selectedDayEvents.map((ev) => (
                            <View key={ev.id} style={styles.eventItemCard}>
                              <View style={styles.eventEmojiCircle}>
                                <Text style={styles.eventEmojiLarge}>{ev.emoji}</Text>
                              </View>

                              <View style={styles.eventInfo}>
                                <Text style={styles.eventTitle}>{ev.title}</Text>
                                {ev.time ? (
                                  <View style={styles.eventMetaRow}>
                                    <Clock size={12} color="#847A94" />
                                    <Text style={styles.eventMetaText}>{ev.time}</Text>
                                  </View>
                                ) : null}
                                {ev.note ? (
                                  <Text style={styles.eventNoteText}>{ev.note}</Text>
                                ) : null}
                              </View>

                              <TouchableOpacity
                                onPress={() => handleDeleteEvent(ev.id)}
                                style={styles.deleteEventButton}
                                activeOpacity={0.7}
                                accessibilityLabel="Remover compromisso"
                              >
                                <Trash2 size={16} color="#C85A54" />
                              </TouchableOpacity>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>

                  {/* ========================================================= */}
                  {/* PRÓXIMOS ENCONTROS MARCADOS                              */}
                  {/* ========================================================= */}
                  <View style={styles.upcomingSection}>
                    <View style={styles.upcomingHeaderRow}>
                      <Sparkles size={14} color={COLORS.accent} />
                      <Text style={styles.upcomingSectionTitle}>
                        Próximos Momentos Marcados
                      </Text>
                    </View>

                    {upcomingEvents.length === 0 ? (
                      <Text style={styles.noUpcomingText}>
                        Nenhuma data futura marcada no momento.
                      </Text>
                    ) : (
                      upcomingEvents.slice(0, 5).map((ev) => (
                        <TouchableOpacity
                          key={`up-${ev.id}`}
                          onPress={() => {
                            const [y, m, d] = ev.date.split('-').map(Number);
                            setCurrentDate(new Date(y, m - 1, 1));
                            setSelectedDateKey(ev.date);
                            setIsAddingEvent(false);
                          }}
                          style={styles.upcomingCard}
                          activeOpacity={0.8}
                        >
                          <View style={styles.upcomingEmojiBox}>
                            <Text style={styles.upcomingEmojiText}>{ev.emoji}</Text>
                          </View>

                          <View style={styles.upcomingDetails}>
                            <Text style={styles.upcomingTitle} numberOfLines={1}>
                              {ev.title}
                            </Text>
                            <Text style={styles.upcomingDateSub}>
                              {formatSelectedDateTitle(ev.date)} {ev.time ? `• ${ev.time}` : ''}
                            </Text>
                          </View>

                          <View style={styles.upcomingCountdownPill}>
                            <Text style={styles.upcomingCountdownText}>
                              {getDaysUntil(ev.date)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))
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

  // -----------------------------------------------------------------
  // Barra do Mês
  // -----------------------------------------------------------------
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F5',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0EBE3',
  },
  monthNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitleText: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#342848',
    letterSpacing: -0.2,
  },
  jumpTodayBadge: {
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  jumpTodayText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.accentDark,
  },

  // -----------------------------------------------------------------
  // Dias da Semana e Grade
  // -----------------------------------------------------------------
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  weekdayText: {
    width: 40,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#8C829B',
    letterSpacing: 0.2,
  },
  weekendText: {
    color: COLORS.accent,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#F2EFEB',
    marginBottom: 16,
  },
  dayCellEmpty: {
    width: '13.5%',
    height: 48,
    marginVertical: 2,
  },
  dayCell: {
    width: '13.5%',
    height: 48,
    marginVertical: 2,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(198, 139, 89, 0.06)',
  },
  dayCellSelected: {
    backgroundColor: '#342848',
    shadowColor: '#342848',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  dayNumberText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2D2D2D',
  },
  dayNumberTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayNumberTextToday: {
    color: COLORS.accentDark,
    fontWeight: '700',
  },
  dayEmojiBadge: {
    marginTop: 1,
  },
  dayEmojiText: {
    fontSize: 11,
    lineHeight: 13,
  },
  dayEmojiPlaceholder: {
    height: 14,
  },

  // -----------------------------------------------------------------
  // Card de Detalhes do Dia Selecionado
  // -----------------------------------------------------------------
  selectedDateCard: {
    backgroundColor: '#FAF9F7',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE7DF',
    marginBottom: 18,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedDateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#28173B',
    letterSpacing: -0.2,
  },
  selectedDateCountdown: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.accent,
    marginTop: 2,
  },
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  addEventButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // -----------------------------------------------------------------
  // Formulário de Criação de Encontro
  // -----------------------------------------------------------------
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#554A66',
    marginBottom: 8,
  },
  emojiList: {
    gap: 8,
    paddingBottom: 8,
  },
  emojiButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7F5F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  emojiButtonActive: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(198, 139, 89, 0.15)',
    transform: [{ scale: 1.1 }],
  },
  emojiButtonText: {
    fontSize: 18,
  },
  customEmojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#FAF8F5',
    padding: 8,
    borderRadius: 12,
  },
  customEmojiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6E647E',
  },
  customEmojiInputWrapper: {
    width: 40,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customEmojiInput: {
    fontSize: 18,
    textAlign: 'center',
    padding: 0,
  },
  customEmojiHint: {
    fontSize: 9.5,
    color: '#9E94AD',
    flex: 1,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#554A66',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#FAFAF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4DFD7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#2D2D2D',
    marginBottom: 10,
  },
  formActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  cancelFormButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F2EFEB',
  },
  cancelFormButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#70687C',
  },
  submitFormButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  submitFormButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // -----------------------------------------------------------------
  // Lista de Eventos do Dia
  // -----------------------------------------------------------------
  dayEventsList: {
    gap: 8,
  },
  emptyDayContainer: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  emptyDayEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  emptyDayText: {
    fontSize: 12,
    color: '#847A94',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyAddButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(198, 139, 89, 0.08)',
    borderRadius: 12,
  },
  emptyAddButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.accentDark,
  },
  eventItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ECE7DF',
    gap: 12,
  },
  eventEmojiCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F8F6F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECE7DF',
  },
  eventEmojiLarge: {
    fontSize: 22,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#28173B',
    marginBottom: 2,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  eventMetaText: {
    fontSize: 11,
    color: '#847A94',
    fontWeight: '500',
  },
  eventNoteText: {
    fontSize: 11,
    color: '#9C93AA',
    marginTop: 2,
  },
  deleteEventButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // -----------------------------------------------------------------
  // Próximos Momentos Marcados
  // -----------------------------------------------------------------
  upcomingSection: {
    marginTop: 4,
  },
  upcomingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  upcomingSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#342848',
    letterSpacing: -0.1,
  },
  noUpcomingText: {
    fontSize: 12,
    color: '#988FA6',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEBE4',
    marginBottom: 8,
    gap: 10,
    shadowColor: '#28173B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  upcomingEmojiBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(198, 139, 89, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingEmojiText: {
    fontSize: 18,
  },
  upcomingDetails: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#28173B',
  },
  upcomingDateSub: {
    fontSize: 10.5,
    color: '#847A94',
    marginTop: 1,
  },
  upcomingCountdownPill: {
    backgroundColor: 'rgba(198, 139, 89, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  upcomingCountdownText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
});
