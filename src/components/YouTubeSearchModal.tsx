import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Image,
  StyleSheet,
  Animated,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Search,
  X,
  Play,
  Music2,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';
import {
  searchYouTubeVideos,
  YouTubeSearchResult,
} from '../services/youtube';
import { useAudio } from '../context/AudioContext';
import {
  triggerLightHaptic,
  triggerSuccessHaptic,
  triggerErrorHaptic,
} from '../utils/haptics';

interface YouTubeSearchModalProps {
  visible: boolean;
  onClose: () => void;
}

export const YouTubeSearchModal: React.FC<YouTubeSearchModalProps> = ({
  visible,
  onClose,
}) => {
  const { currentSong, selectSong } = useAudio();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSearchResults([]);
      setIsLoading(false);
      setError(null);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 11,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    }
  }, [visible, fadeAnim, slideAnim]);

  const executeSearch = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await searchYouTubeVideos(trimmed);
      setSearchResults(results);
    } catch (err: any) {
      console.warn('Erro ao buscar vídeos no YouTube:', err);
      triggerErrorHaptic();
      setError(
        err?.message ||
          'Não foi possível consultar a YouTube API. Verifique a sua conexão e a chave de API.'
      );
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (text: string) => {
    setSearchQuery(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!text.trim()) {
      setSearchResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Busca dinâmica com debounce para digitação fluida
    debounceRef.current = setTimeout(() => {
      executeSearch(text);
    }, 550);
  };

  const handleSubmit = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    executeSearch(searchQuery);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsLoading(false);
    setError(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  };

  const handleSelectSong = async (item: YouTubeSearchResult) => {
    triggerSuccessHaptic();
    // Extrai o videoId (id.videoId da API mapeado), salva no Firestore e dispara reprodução
    await selectSong({
      videoId: item.videoId,
      title: item.title,
      channelTitle: item.channelTitle,
      thumbnailUrl: item.thumbnailUrl,
    });
    handleClose();
  };

  const handleClose = () => {
    triggerLightHaptic();
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      onClose();
    });
  };

  const renderItem = ({ item }: { item: YouTubeSearchResult }) => {
    const isSelected = currentSong?.videoId === item.videoId;

    return (
      <TouchableOpacity
        onPress={() => handleSelectSong(item)}
        activeOpacity={0.78}
        style={[styles.cardContainer, isSelected && styles.cardSelected]}
        accessibilityRole="button"
        accessibilityLabel={`Selecionar ${item.title}`}
      >
        <View style={styles.thumbnailWrapper}>
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.playOverlay}>
            <Play size={13} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </View>

        <View style={styles.infoWrapper}>
          <Text style={styles.songTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.channelTitle} numberOfLines={1}>
            {item.channelTitle}
          </Text>
        </View>

        <View style={styles.actionColumn}>
          {isSelected ? (
            <View style={styles.selectedBadge}>
              <Sparkles size={11} color={COLORS.accent} />
              <Text style={styles.selectedBadgeText}>Tocando</Text>
            </View>
          ) : (
            <View style={styles.selectButton}>
              <Text style={styles.selectButtonText}>Escolher</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}
          >
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <Animated.View
                style={[
                  styles.modalContent,
                  {
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                {/* Header */}
                <View style={styles.headerRow}>
                  <View style={styles.headerLeft}>
                    <View style={styles.iconCircle}>
                      <Music2 size={18} color={COLORS.accent} strokeWidth={2.2} />
                    </View>
                    <View>
                      <Text style={styles.headerTitle}>Música do Casal</Text>
                      <Text style={styles.headerSubtitle}>
                        Busca dinâmica na YouTube Data API
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleClose}
                    activeOpacity={0.7}
                    style={styles.closeButton}
                  >
                    <X size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Barra de Pesquisa */}
                <View style={styles.searchBarContainer}>
                  <Search size={16} color={COLORS.accent} style={styles.searchIcon} />
                  <TextInput
                    style={[
                      styles.searchInput,
                      Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as any),
                    ]}
                    placeholder="Nome da música, artista ou link do YouTube..."
                    placeholderTextColor={COLORS.textMuted}
                    value={searchQuery}
                    onChangeText={handleQueryChange}
                    onSubmitEditing={handleSubmit}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={handleClear}
                      style={styles.clearSearchBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <X size={14} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={handleSubmit}
                    style={styles.searchSubmitBtn}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.searchSubmitBtnText}>Buscar</Text>
                  </TouchableOpacity>
                </View>

                {/* Indicador de Carregamento */}
                {isLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.accent} />
                    <Text style={styles.loadingText}>Buscando músicas no YouTube...</Text>
                  </View>
                )}

                {/* Exibição de Erro */}
                {error && !isLoading && (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={18} color="#D9534F" style={{ marginRight: 8, flexShrink: 0 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.errorTitle}>Erro na busca do YouTube</Text>
                      <Text style={styles.errorSubtitle}>{error}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={handleSubmit}
                      style={styles.retryBtn}
                      activeOpacity={0.75}
                    >
                      <RefreshCw size={13} color={COLORS.accentDark} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Estado Inicial (Nenhuma busca feita) */}
                {!isLoading && !error && searchResults.length === 0 && !searchQuery.trim() && (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                      <Music2 size={24} color={COLORS.accent} strokeWidth={1.8} />
                    </View>
                    <Text style={styles.emptyTitle}>Escolha a Trilha Sonora do Casal</Text>
                    <Text style={styles.emptySubtitle}>
                      Digite o nome de uma música, artista ou cole um link do YouTube para buscar em tempo real.
                    </Text>
                  </View>
                )}

                {/* Estado Sem Resultados */}
                {!isLoading && !error && searchResults.length === 0 && searchQuery.trim().length > 0 && (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>Nenhum resultado encontrado</Text>
                    <Text style={styles.emptySubtitle}>
                      Tente buscar com outras palavras ou cole o link direto do vídeo do YouTube.
                    </Text>
                  </View>
                )}

                {/* Lista Dinâmica de Resultados */}
                {!isLoading && searchResults.length > 0 && (
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.videoId}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  />
                )}
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
    backgroundColor: 'rgba(28, 20, 38, 0.45)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    height: Platform.OS === 'web' ? '82vh' : '82%',
    maxHeight: 680,
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(198, 139, 89, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.25)',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
    marginRight: 4,
  },
  searchSubmitBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  searchSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.accentDark,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  errorSubtitle: {
    fontSize: 11.5,
    color: '#B91C1C',
    lineHeight: 15,
  },
  retryBtn: {
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(198, 139, 89, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },
  listContent: {
    paddingBottom: 16,
    gap: 8,
  },
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardSelected: {
    borderColor: 'rgba(198, 139, 89, 0.45)',
    backgroundColor: '#FFFDF9',
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 58,
    height: 58,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#EAE6E1',
    marginRight: 10,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoWrapper: {
    flex: 1,
    marginRight: 8,
  },
  songTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 17,
    marginBottom: 3,
  },
  channelTitle: {
    fontSize: 11.5,
    color: COLORS.textMuted,
  },
  actionColumn: {
    alignItems: 'flex-end',
  },
  selectButton: {
    backgroundColor: 'rgba(198, 139, 89, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  selectButtonText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.accentDark,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(198, 139, 89, 0.18)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 3,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentDark,
  },
});
