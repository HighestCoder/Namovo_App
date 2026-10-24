import './global.css';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Animated,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { LockScreen } from './src/components/LockScreen';
import { PairingView } from './src/components/PairingView';
import {
  STORAGE_COUPLE_ID_KEY,
  STORAGE_PRIVATE_ACCESS_KEY,
  STORAGE_COUPLE_DATA_KEY,
} from './src/constants/storage';
import { OnboardingView } from './src/components/OnboardingView';
import { HomeView } from './src/components/HomeView';
import { CoupleData } from './src/types';
import { COLORS } from './src/theme/colors';
import {
  setActiveCoupleCode,
  subscribeToCoupleDocument,
  saveCoupleDataToFirestore,
  validateCoupleCodeInFirestore,
} from './src/services/firebase';

const DEFAULT_COUPLE_DATA: CoupleData = {
  partner1: 'Amor',
  partner2: 'Você',
  startDate: new Date().toISOString().split('T')[0],
};

export default function App() {
  const [coupleData, setCoupleData] = useState<CoupleData | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [hasPrivateAccess, setHasPrivateAccess] = useState<boolean>(false);
  const [isAutoLocked, setIsAutoLocked] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAppReady, setIsAppReady] = useState<boolean>(false);

  // Animações para transição suave entre os dois estados
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  // Refs para monitoramento de tempo em segundo plano (Auto-Lock 2 minutos)
  const backgroundTimeRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');

  // 1. Injeção dinâmica de proteção anti-indexação e metadados PWA na Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Força noindex, nofollow absoluto contra robôs de busca
      let robotsMeta = document.querySelector('meta[name="robots"]');
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.setAttribute('name', 'robots');
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute('content', 'noindex, nofollow, noarchive, nosnippet');

      // Garante meta tags da PWA no iOS Safari
      let webAppCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
      if (!webAppCapable) {
        webAppCapable = document.createElement('meta');
        webAppCapable.setAttribute('name', 'apple-mobile-web-app-capable');
        webAppCapable.setAttribute('content', 'yes');
        document.head.appendChild(webAppCapable);
      }
    }
  }, []);

  // 2. Hidratação estrita e global do armazenamento local (AsyncStorage e window.localStorage)
  // Bloqueia qualquer renderização de telas (PIN, Pareamento, Home) até que ambos os valores estejam carregados
  useEffect(() => {
    let isMounted = true;

    const hydrateStorage = async () => {
      try {
        // Leitura simultânea do status do PIN de privacidade, Couple Code e Cache do casal
        let [storedPrivateAccess, storedCoupleId, cachedData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_PRIVATE_ACCESS_KEY).catch(() => null),
          AsyncStorage.getItem(STORAGE_COUPLE_ID_KEY).catch(() => null),
          AsyncStorage.getItem(STORAGE_COUPLE_DATA_KEY).catch(() => null),
        ]);

        // Fallback e sincronização direta com window.localStorage no ambiente Web / Safari iOS PWA
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          try {
            if (!storedPrivateAccess) {
              storedPrivateAccess = window.localStorage.getItem(STORAGE_PRIVATE_ACCESS_KEY);
            }
            if (!storedCoupleId) {
              storedCoupleId = window.localStorage.getItem(STORAGE_COUPLE_ID_KEY);
            }
            if (!cachedData) {
              cachedData = window.localStorage.getItem(STORAGE_COUPLE_DATA_KEY);
            }
          } catch (storageErr) {
            console.warn('Aviso ao ler window.localStorage no boot:', storageErr);
          }
        }

        if (!isMounted) return;

        // 1. Hidrata o status do PIN de privacidade (Acesso Privado 021727)
        if (storedPrivateAccess === 'true') {
          setHasPrivateAccess(true);
        } else {
          setHasPrivateAccess(false);
        }

        // 2. Hidrata o código do casal (Couple Code)
        if (storedCoupleId && storedCoupleId.trim()) {
          const cleanCode = storedCoupleId.trim().toUpperCase();
          setActiveCoupleCode(cleanCode);
          setCoupleId(cleanCode);

          // Validação silenciosa em segundo plano no Firestore (preserva dados de parceiro e criador)
          validateCoupleCodeInFirestore(cleanCode)
            .then((exists) => {
              if (exists && isMounted) {
                setCoupleId(cleanCode);
                setActiveCoupleCode(cleanCode);
              }
            })
            .catch(() => {});
        }

        // 3. Hidrata os dados cacheados do casal para renderização instantânea do dashboard
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            if (parsed && parsed.partner1 && parsed.partner2) {
              setCoupleData(parsed);
            }
          } catch (_) {}
        }
      } catch (err) {
        console.warn('Erro durante a hidratação inicial do armazenamento local:', err);
      } finally {
        if (isMounted) {
          // Libera a navegação somente após a hidratação estar 100% resolvida
          setIsAppReady(true);
        }
      }
    };

    hydrateStorage();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2.1. Assinatura em tempo real (onSnapshot) do documento compartilhado no Firestore (couples/{coupleCode})
  useEffect(() => {
    if (!coupleId) return;

    setActiveCoupleCode(coupleId);

    const unsubscribe = subscribeToCoupleDocument(coupleId, (docData) => {
      if (docData && docData.coupleData) {
        setCoupleData(docData.coupleData);
        AsyncStorage.setItem(STORAGE_COUPLE_DATA_KEY, JSON.stringify(docData.coupleData)).catch(() => {});
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_COUPLE_DATA_KEY, JSON.stringify(docData.coupleData));
        }
      } else {
        // Se o documento no Firestore ainda não tiver coupleData mas o aparelho tiver em cache local, sincroniza com a nuvem
        AsyncStorage.getItem(STORAGE_COUPLE_DATA_KEY)
          .then((cached) => {
            if (!cached && Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
              cached = window.localStorage.getItem(STORAGE_COUPLE_DATA_KEY);
            }
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.partner1 && parsed.partner2) {
                setCoupleData(parsed);
                saveCoupleDataToFirestore(parsed, coupleId).catch(() => {});
              }
            }
          })
          .catch(() => {});
      }
    });

    return () => {
      unsubscribe();
    };
  }, [coupleId]);

  // 3. Monitoramento do ciclo de vida: Bloqueio automático após mais de 2 minutos em segundo plano
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // Marca o timestamp do momento em que o aplicativo foi minimizado
        backgroundTimeRef.current = Date.now();
      } else if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Aplicativo retornou ao primeiro plano
        if (backgroundTimeRef.current !== null) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          const TWO_MINUTES_MS = 2 * 60 * 1000;
          if (elapsed >= TWO_MINUTES_MS) {
            // Mais de 2 minutos em background: ativa auto-lock
            setIsAutoLocked(true);
          }
          backgroundTimeRef.current = null;
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  // Executa animação sempre que mudar de estado
  useEffect(() => {
    if (!isAppReady || !hasPrivateAccess || isAutoLocked) return;

    fadeAnim.setValue(0);
    slideAnim.setValue(12);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [hasPrivateAccess, isAutoLocked, coupleId, coupleData, isEditing, isAppReady]);

  // Transição: Desbloqueio bem-sucedido (seja por PIN ou Biometria)
  const handleUnlock = async () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_PRIVATE_ACCESS_KEY, 'true');
      }
      await AsyncStorage.setItem(STORAGE_PRIVATE_ACCESS_KEY, 'true');

      // Garante a recuperação e atualização imediata do Couple Code logo após o desbloqueio
      let storedCoupleId = coupleId;
      if (!storedCoupleId) {
        storedCoupleId = await AsyncStorage.getItem(STORAGE_COUPLE_ID_KEY).catch(() => null);
        if (
          !storedCoupleId &&
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          window.localStorage
        ) {
          storedCoupleId = window.localStorage.getItem(STORAGE_COUPLE_ID_KEY);
        }

        if (storedCoupleId && storedCoupleId.trim()) {
          const cleanCode = storedCoupleId.trim().toUpperCase();
          setActiveCoupleCode(cleanCode);
          setCoupleId(cleanCode);
        }
      }

      // Carrega cache local dos dados do casal caso ainda não carregado
      if (!coupleData) {
        let cachedData = await AsyncStorage.getItem(STORAGE_COUPLE_DATA_KEY).catch(() => null);
        if (
          !cachedData &&
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          window.localStorage
        ) {
          cachedData = window.localStorage.getItem(STORAGE_COUPLE_DATA_KEY);
        }
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            if (parsed && parsed.partner1 && parsed.partner2) {
              setCoupleData(parsed);
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn('Erro ao restaurar sessão no desbloqueio:', err);
    } finally {
      setHasPrivateAccess(true);
      setIsAutoLocked(false);
    }
  };

  // Pareamento concluído (Gerar ou Inserir código de 5 caracteres)
  const handlePaired = async (code: string, initialData?: CoupleData | null) => {
    const cleanCode = code.trim().toUpperCase();
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);
      }
      await AsyncStorage.setItem(STORAGE_COUPLE_ID_KEY, cleanCode);

      if (initialData) {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(STORAGE_COUPLE_DATA_KEY, JSON.stringify(initialData));
        }
        await AsyncStorage.setItem(STORAGE_COUPLE_DATA_KEY, JSON.stringify(initialData));
      }
    } catch (err) {
      console.warn('Erro ao persistir sessão do couple code em handlePaired:', err);
    }

    setActiveCoupleCode(cleanCode);
    setCoupleId(cleanCode);
    if (initialData) {
      setCoupleData(initialData);
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: -10,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  };

  // Desvincular código de pareamento
  const handleUnpair = async () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(async () => {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(STORAGE_COUPLE_ID_KEY);
          window.localStorage.removeItem(STORAGE_COUPLE_DATA_KEY);
        }
        await AsyncStorage.removeItem(STORAGE_COUPLE_ID_KEY);
        await AsyncStorage.removeItem(STORAGE_COUPLE_DATA_KEY);
      } catch (err) {
        console.warn('Erro ao desvincular código:', err);
      }
      setCoupleId(null);
      setCoupleData(null);
    });
  };

  // Bloqueio manual do aplicativo (reexibe a tela de PIN)
  const handleLockApp = async () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_PRIVATE_ACCESS_KEY);
      }
      await AsyncStorage.removeItem(STORAGE_PRIVATE_ACCESS_KEY);
    } catch (err) {
      console.warn('Erro ao bloquear app:', err);
    }
    setIsAutoLocked(true);
    setHasPrivateAccess(false);
  };

  // Transição: Salvar dados no Firestore (documento compartilhado do casal) e ir para a Home
  const handleSaveData = async (data: CoupleData) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: -12,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(async () => {
      setCoupleData(data);
      setIsEditing(false);
      AsyncStorage.setItem(STORAGE_COUPLE_DATA_KEY, JSON.stringify(data)).catch(() => {});
      await saveCoupleDataToFirestore(data, coupleId || undefined);
    });
  };

  // Transição: Entrar no modo de edição (volta suavemente ao onboarding)
  const handleStartEdit = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideAnim, {
        toValue: 12,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setIsEditing(true);
    });
  };

  // Atualização direta das configurações do casal no Firestore (nomes e data de início)
  const handleUpdateCoupleData = async (updated: CoupleData) => {
    setCoupleData(updated);
    AsyncStorage.setItem(STORAGE_COUPLE_DATA_KEY, JSON.stringify(updated)).catch(() => {});
    await saveCoupleDataToFirestore(updated, coupleId || undefined);
  };

  // Atualização da foto / mídia em destaque no Firestore
  const handleUpdateFeaturedPhoto = async (newUrl: string, caption?: string) => {
    if (!coupleData) return;
    const updated: CoupleData = {
      ...coupleData,
      featuredImage: newUrl,
      featuredCaption: caption || coupleData.featuredCaption,
    };
    setCoupleData(updated);
    AsyncStorage.setItem(STORAGE_COUPLE_DATA_KEY, JSON.stringify(updated)).catch(() => {});
    await saveCoupleDataToFirestore(updated, coupleId || undefined);
  };

  // Transição: Redefinir dados do casal no Firestore
  const handleResetData = async () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(async () => {
      setCoupleData(null);
      setIsEditing(false);
      AsyncStorage.removeItem(STORAGE_COUPLE_DATA_KEY).catch(() => {});
      await saveCoupleDataToFirestore(null, coupleId || undefined);
    });
  };

  // 0. Bloqueio estrito de carregamento e hidratação global
  // Bloqueia e NÃO renderiza a árvore de telas (PIN, Onboarding, Pareamento ou Home)
  // até que a leitura do armazenamento esteja 100% concluída.
  if (!isAppReady) {
    return (
      <View style={styles.loadingContainer}>
        <ExpoStatusBar style="dark" />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // 1. Barreira Obrigatória de Privacidade Inicial e Auto-Lock após 2min em background
  const shouldShowLockScreen = !hasPrivateAccess || isAutoLocked;
  if (shouldShowLockScreen) {
    return (
      <SafeAreaView style={styles.rootContainer}>
        <ExpoStatusBar style="dark" />
        <LockScreen onUnlock={handleUnlock} />
      </SafeAreaView>
    );
  }

  // Barreira de Pareamento Local (Couple Code Onboarding Wall)
  if (!coupleId) {
    return (
      <SafeAreaView style={styles.rootContainer}>
        <ExpoStatusBar style="dark" />
        <PairingView onPaired={handlePaired} />
      </SafeAreaView>
    );
  }

  // Se o coupleId existe, roteia diretamente para o Dashboard Principal
  const activeCoupleData: CoupleData = coupleData || DEFAULT_COUPLE_DATA;
  const shouldShowOnboarding = isEditing;

  return (
    <SafeAreaView style={styles.rootContainer}>
      <ExpoStatusBar style="dark" />

      <Animated.View
        style={[
          styles.animatedContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {shouldShowOnboarding ? (
          <OnboardingView
            initialData={coupleData}
            onSubmit={handleSaveData}
          />
        ) : (
          <HomeView
            data={activeCoupleData}
            coupleCode={coupleId}
            onEdit={handleStartEdit}
            onReset={handleResetData}
            onUnpairCode={handleUnpair}
            onUpdatePhoto={handleUpdateFeaturedPhoto}
            onUpdateCoupleData={handleUpdateCoupleData}
            onLockApp={handleLockApp}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  animatedContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
