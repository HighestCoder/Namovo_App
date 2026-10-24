import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Play, Pause, Search, Sparkles, Music2 } from 'lucide-react-native';
import { useAudio } from '../context/AudioContext';
import { COLORS } from '../theme/colors';

export const MusicPlayerPill: React.FC = () => {
  const { isPlaying, isLoading, currentSong, togglePlay, openSearchModal } = useAudio();

  // Animações para o player de música
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bar1Anim = useRef(new Animated.Value(4)).current;
  const bar2Anim = useRef(new Animated.Value(10)).current;
  const bar3Anim = useRef(new Animated.Value(6)).current;

  // Efeito de pulso suave quando a música está tocando
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (isPlaying) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.025,
            duration: 1200,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      loop.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (loop) loop.stop();
    };
  }, [isPlaying, pulseAnim]);

  // Visualizador de ondas sonoras animadas (barras do mini equalizador)
  useEffect(() => {
    let loop1: Animated.CompositeAnimation | null = null;
    let loop2: Animated.CompositeAnimation | null = null;
    let loop3: Animated.CompositeAnimation | null = null;

    if (isPlaying) {
      loop1 = Animated.loop(
        Animated.sequence([
          Animated.timing(bar1Anim, { toValue: 12, duration: 420, useNativeDriver: false }),
          Animated.timing(bar1Anim, { toValue: 3, duration: 420, useNativeDriver: false }),
        ])
      );
      loop2 = Animated.loop(
        Animated.sequence([
          Animated.timing(bar2Anim, { toValue: 4, duration: 330, useNativeDriver: false }),
          Animated.timing(bar2Anim, { toValue: 14, duration: 330, useNativeDriver: false }),
        ])
      );
      loop3 = Animated.loop(
        Animated.sequence([
          Animated.timing(bar3Anim, { toValue: 13, duration: 490, useNativeDriver: false }),
          Animated.timing(bar3Anim, { toValue: 5, duration: 490, useNativeDriver: false }),
        ])
      );

      loop1.start();
      loop2.start();
      loop3.start();
    } else {
      bar1Anim.setValue(4);
      bar2Anim.setValue(9);
      bar3Anim.setValue(5);
    }

    return () => {
      if (loop1) loop1.stop();
      if (loop2) loop2.stop();
      if (loop3) loop3.stop();
    };
  }, [isPlaying, bar1Anim, bar2Anim, bar3Anim]);

  const handlePressPlay = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 90, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 110, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    togglePlay();
  };

  const songDisplayTitle = currentSong?.title || 'Nossa Música';

  return (
    <Animated.View
      style={[
        styles.outerContainer,
        {
          transform: [
            { scale: scaleAnim },
            { scale: pulseAnim },
          ],
        },
      ]}
    >
      <View style={[styles.glassPill, isPlaying && styles.glassPillActive]}>
        {/* 1. Botão Play / Pause com Mini Thumbnail do YouTube */}
        <TouchableOpacity
          onPress={handlePressPlay}
          activeOpacity={0.75}
          style={[styles.playButton, isPlaying && styles.playButtonActive]}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pausar música do YouTube' : 'Tocar música do YouTube'}
        >
          {/* Mini Thumbnail do Vídeo */}
          {currentSong?.thumbnailUrl ? (
            <Image
              source={{ uri: currentSong.thumbnailUrl }}
              style={styles.miniThumbnail}
              resizeMode="cover"
            />
          ) : null}

          {/* Overlay com Ícone de Play / Pause */}
          <View style={[styles.iconOverlay, isPlaying && styles.iconOverlayActive]}>
            {isLoading ? (
              <ActivityIndicator size={11} color="#FFFFFF" />
            ) : isPlaying ? (
              <Pause size={12} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2.5} />
            ) : (
              <Play size={12} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 1 }} />
            )}
          </View>
        </TouchableOpacity>

        {/* 2. Área Central com Título da Música e Equalizador */}
        <TouchableOpacity
          onPress={handlePressPlay}
          activeOpacity={0.8}
          style={styles.infoContainer}
          accessibilityRole="button"
          accessibilityLabel={`Faixa atual: ${songDisplayTitle}. Toque para alternar reprodução.`}
        >
          {isPlaying ? (
            <View style={styles.equalizerRow}>
              <Animated.View style={[styles.eqBar, { height: bar1Anim }]} />
              <Animated.View style={[styles.eqBar, { height: bar2Anim }]} />
              <Animated.View style={[styles.eqBar, { height: bar3Anim }]} />
            </View>
          ) : (
            <Music2 size={12} color={COLORS.accent} strokeWidth={2} style={styles.musicIcon} />
          )}

          <View style={styles.textColumn}>
            <Text
              style={[styles.titleText, isPlaying && styles.titleTextPlaying]}
              numberOfLines={1}
            >
              {songDisplayTitle}
            </Text>
          </View>

          {isPlaying && (
            <Sparkles size={10} color={COLORS.accent} strokeWidth={2} style={styles.sparkleIcon} />
          )}
        </TouchableOpacity>

        {/* Linha Divisória Sutil */}
        <View style={styles.divider} />

        {/* 3. Botão "Change Song" (Abre o Modal de Busca no YouTube) */}
        <TouchableOpacity
          onPress={openSearchModal}
          activeOpacity={0.7}
          style={styles.searchButton}
          accessibilityRole="button"
          accessibilityLabel="Trocar música do casal via YouTube"
        >
          <Search size={13} color={COLORS.accentDark} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 9999,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: 'rgba(198, 139, 89, 0.24)',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    maxWidth: 300,
  },
  glassPillActive: {
    backgroundColor: 'rgba(255, 252, 248, 0.94)',
    borderColor: 'rgba(198, 139, 89, 0.42)',
    shadowColor: COLORS.accent,
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  playButton: {
    position: 'relative',
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(198, 139, 89, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: COLORS.accent,
  },
  miniThumbnail: {
    width: '100%',
    height: '100%',
  },
  iconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 20, 40, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOverlayActive: {
    backgroundColor: 'rgba(198, 139, 89, 0.65)',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    flexShrink: 1,
  },
  musicIcon: {
    marginRight: 6,
  },
  equalizerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 14,
    marginRight: 6,
    gap: 2,
  },
  eqBar: {
    width: 2.5,
    borderRadius: 1.5,
    backgroundColor: COLORS.accent,
  },
  textColumn: {
    flexShrink: 1,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  titleTextPlaying: {
    color: COLORS.accentDark,
    fontWeight: '700',
  },
  sparkleIcon: {
    marginLeft: 5,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(198, 139, 89, 0.2)',
    marginHorizontal: 3,
  },
  searchButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(198, 139, 89, 0.1)',
  },
});
