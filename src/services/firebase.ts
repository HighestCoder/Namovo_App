import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  arrayUnion,
  Firestore,
} from 'firebase/firestore';
import {
  CoupleData,
  CalendarEvent,
  GiftIdea,
  RouletteLocation,
  Trip,
  CoupleMemory,
} from '../types';

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  createdAt: number;
}

export interface SharedCoupleDocument {
  coupleCode: string;
  coupleData?: CoupleData | null;
  messages?: ChatMessage[];
  gifts?: GiftIdea[];
  calendarEvents?: CalendarEvent[];
  rouletteLocations?: RouletteLocation[];
  trips?: Trip[];
  memories?: CoupleMemory[];
  moodIndex?: number;
  loveTaps?: number;
  updatedAt?: number;
  createdAt?: number;
}

// Configuração oficial do Firebase conectada ao projeto 'namovo-310125'
const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyBC7HlrNbPQ1fIy-gcB52fLbA62ABtPWWc',
  authDomain: 'namovo-310125.firebaseapp.com',
  projectId: 'namovo-310125',
  storageBucket: 'namovo-310125.firebasestorage.app',
  messagingSenderId: '703272554813',
  appId: '1:703272554813:web:52e70ea8059b4b32b27554',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);

// Estado global em memória do coupleCode ativo na sessão
let currentActiveCoupleCode: string | null = null;

export const setActiveCoupleCode = (code: string | null) => {
  currentActiveCoupleCode = code ? code.trim().toUpperCase() : null;
};

export const getActiveCoupleCode = (): string => {
  return currentActiveCoupleCode || 'NAMOV';
};

// Remove propriedades `undefined` antes de enviar ao Firestore
const sanitizeForFirestore = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data));
};

// Dados iniciais padrão caso um novo código seja criado do zero
export const INITIAL_DEMO_MESSAGES: ChatMessage[] = [
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

export const INITIAL_GIFTS: GiftIdea[] = [
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

const formatDateKey = (year: number, month: number, day: number): string => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

export const getInitialCalendarEvents = (): CalendarEvent[] => {
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
      date: formatDateKey(
        event1Date.getFullYear(),
        event1Date.getMonth(),
        event1Date.getDate()
      ),
      title: 'Jantar Romântico à Luz de Velas',
      emoji: '🍷',
      time: '20:30',
      note: 'Restaurante especial para nós dois',
      createdAt: Date.now() - 2000,
    },
    {
      id: 'event-init-2',
      date: formatDateKey(
        event2Date.getFullYear(),
        event2Date.getMonth(),
        event2Date.getDate()
      ),
      title: 'Noite de Cinema & Aconchego',
      emoji: '🎬',
      time: '19:45',
      note: 'Com pipoca doce e chocolates favoritos',
      createdAt: Date.now() - 1000,
    },
    {
      id: 'event-init-3',
      date: formatDateKey(
        event3Date.getFullYear(),
        event3Date.getMonth(),
        event3Date.getDate()
      ),
      title: 'Passeio ao Pôr do Sol',
      emoji: '✨',
      time: '17:30',
      note: 'Caminhada de mãos dadas',
      createdAt: Date.now(),
    },
  ];
};

/**
 * Inicializa ou conecta ao documento compartilhado `couples/{coupleCode}` no Firestore.
 * Se o documento já existir (ex: parceiro inserindo o código gerado), preserva todos os dados existentes!
 */
export const initializeOrJoinCoupleSpace = async (
  rawCode: string
): Promise<SharedCoupleDocument> => {
  const code = rawCode.trim().toUpperCase();
  setActiveCoupleCode(code);

  const coupleRef = doc(db, 'couples', code);
  const snap = await getDoc(coupleRef);

  if (snap.exists()) {
    return snap.data() as SharedCoupleDocument;
  }

  const initialDoc: SharedCoupleDocument = sanitizeForFirestore({
    coupleCode: code,
    coupleData: null,
    messages: INITIAL_DEMO_MESSAGES,
    gifts: INITIAL_GIFTS,
    calendarEvents: getInitialCalendarEvents(),
    moodIndex: 0,
    loveTaps: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  await setDoc(coupleRef, initialDoc, { merge: true });
  return initialDoc;
};

/**
 * Validação no ciclo de boot: verifica se o documento do casal existe no Firestore pelo ID.
 * Aceita e valida igualmente o criador e o participante (joiner).
 */
export const validateCoupleCodeInFirestore = async (
  rawCode: string
): Promise<boolean> => {
  try {
    const code = rawCode.trim().toUpperCase();
    const coupleRef = doc(db, 'couples', code);
    const snap = await getDoc(coupleRef);
    return snap.exists();
  } catch (err) {
    console.warn('Aviso ao validar coupleCode no Firestore:', err);
    // Em caso de offline ou erro temporário de rede, mantém a sessão ativa (sem limpar dados)
    return true;
  }
};

/**
 * Escuta em tempo real (onSnapshot) o documento completo do casal `couples/{coupleCode}`
 */
export const subscribeToCoupleDocument = (
  coupleCode: string,
  onUpdate: (docData: SharedCoupleDocument) => void
): (() => void) => {
  const code = coupleCode.trim().toUpperCase();
  setActiveCoupleCode(code);
  const coupleRef = doc(db, 'couples', code);

  return onSnapshot(
    coupleRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as SharedCoupleDocument);
      } else {
        // Cria automaticamente o documento caso ainda não exista
        initializeOrJoinCoupleSpace(code)
          .then(onUpdate)
          .catch((err) =>
            console.warn('Erro ao inicializar documento do casal:', err)
          );
      }
    },
    (error) => {
      console.warn('Erro no onSnapshot do documento do casal:', error.message);
    }
  );
};

/**
 * Atualiza os dados principais do casal (nomes, data de início, foto em destaque) no Firestore
 */
export const saveCoupleDataToFirestore = async (
  coupleData: CoupleData | null,
  coupleCode?: string
): Promise<void> => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);
  await setDoc(
    coupleRef,
    sanitizeForFirestore({
      coupleCode: code,
      coupleData,
      updatedAt: Date.now(),
    }),
    { merge: true }
  );
};

/**
 * Atualiza o estado interativo (humor do casal / contador de carinhos) no Firestore
 */
export const saveCoupleInteractiveStateToFirestore = async (
  partial: { moodIndex?: number; loveTaps?: number },
  coupleCode?: string
): Promise<void> => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);
  await setDoc(
    coupleRef,
    sanitizeForFirestore({
      ...partial,
      updatedAt: Date.now(),
    }),
    { merge: true }
  );
};

// ============================================================================
// 1. CARTAS (Mensagens em Tempo Real via onSnapshot)
// ============================================================================

export const subscribeToChatMessages = (
  onUpdate: (messages: ChatMessage[]) => void,
  coupleCode?: string
): (() => void) => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);

  return onSnapshot(
    coupleRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SharedCoupleDocument;
        const list = Array.isArray(data.messages)
          ? data.messages
          : INITIAL_DEMO_MESSAGES;
        onUpdate(list);
      } else {
        onUpdate(INITIAL_DEMO_MESSAGES);
      }
    },
    (error) => {
      console.warn('Erro ao sincronizar Cartas no Firestore:', error.message);
    }
  );
};

export const sendChatMessage = async (
  senderName: string,
  text: string,
  coupleCode?: string
): Promise<ChatMessage> => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    senderName,
    text: text.trim(),
    createdAt: Date.now(),
  };

  await setDoc(
    coupleRef,
    {
      coupleCode: code,
      messages: arrayUnion(sanitizeForFirestore(newMsg)),
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  return newMsg;
};

// ============================================================================
// 2. PRESENTES (Lista de Desejos em Tempo Real via onSnapshot)
// ============================================================================

export const subscribeToGifts = (
  onUpdate: (gifts: GiftIdea[]) => void,
  coupleCode?: string
): (() => void) => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);

  return onSnapshot(
    coupleRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SharedCoupleDocument;
        const list = Array.isArray(data.gifts) ? data.gifts : INITIAL_GIFTS;
        onUpdate(list);
      } else {
        onUpdate(INITIAL_GIFTS);
      }
    },
    (error) => {
      console.warn(
        'Erro ao sincronizar Presentes no Firestore:',
        error.message
      );
    }
  );
};

export const saveGiftsToFirestore = async (
  gifts: GiftIdea[],
  coupleCode?: string
): Promise<void> => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);

  await setDoc(
    coupleRef,
    {
      coupleCode: code,
      gifts: sanitizeForFirestore(gifts),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
};

// ============================================================================
// 3. CALENDÁRIO (Datas & Emojis em Tempo Real via onSnapshot)
// ============================================================================

export const subscribeToCalendarEvents = (
  onUpdate: (events: CalendarEvent[]) => void,
  coupleCode?: string
): (() => void) => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);

  return onSnapshot(
    coupleRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SharedCoupleDocument;
        const list = Array.isArray(data.calendarEvents)
          ? data.calendarEvents
          : getInitialCalendarEvents();
        onUpdate(list);
      } else {
        onUpdate(getInitialCalendarEvents());
      }
    },
    (error) => {
      console.warn(
        'Erro ao sincronizar Calendário no Firestore:',
        error.message
      );
    }
  );
};

export const saveCalendarEventsToFirestore = async (
  events: CalendarEvent[],
  coupleCode?: string
): Promise<void> => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);

  await setDoc(
    coupleRef,
    {
      coupleCode: code,
      calendarEvents: sanitizeForFirestore(events),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
};

// ============================================================================
// 4. ENCONTROS, VIAGENS & MEMÓRIAS (Sincronização em Tempo Real no Mesmo Doc)
// ============================================================================

export const subscribeToRouletteLocations = (
  onUpdate: (locations: RouletteLocation[]) => void,
  coupleCode?: string
): (() => void) => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);

  return onSnapshot(
    coupleRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SharedCoupleDocument;
        onUpdate(
          Array.isArray(data.rouletteLocations)
            ? data.rouletteLocations
            : []
        );
      } else {
        onUpdate([]);
      }
    },
    (error) => {
      console.warn('Erro ao sincronizar Roleta no Firestore:', error.message);
    }
  );
};

export const saveRouletteLocationsToFirestore = async (
  locations: RouletteLocation[],
  coupleCode?: string
): Promise<void> => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);
  await setDoc(
    coupleRef,
    {
      coupleCode: code,
      rouletteLocations: sanitizeForFirestore(locations),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
};

export const subscribeToTrips = (
  onUpdate: (trips: Trip[]) => void,
  coupleCode?: string
): (() => void) => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);

  return onSnapshot(
    coupleRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SharedCoupleDocument;
        onUpdate(Array.isArray(data.trips) ? data.trips : []);
      } else {
        onUpdate([]);
      }
    },
    (error) => {
      console.warn('Erro ao sincronizar Viagens no Firestore:', error.message);
    }
  );
};

export const saveTripsToFirestore = async (
  trips: Trip[],
  coupleCode?: string
): Promise<void> => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);
  await setDoc(
    coupleRef,
    {
      coupleCode: code,
      trips: sanitizeForFirestore(trips),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
};

export const subscribeToMemories = (
  onUpdate: (memories: CoupleMemory[]) => void,
  coupleCode?: string
): (() => void) => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);

  return onSnapshot(
    coupleRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SharedCoupleDocument;
        onUpdate(Array.isArray(data.memories) ? data.memories : []);
      } else {
        onUpdate([]);
      }
    },
    (error) => {
      console.warn('Erro ao sincronizar Memórias no Firestore:', error.message);
    }
  );
};

export const saveMemoriesToFirestore = async (
  memories: CoupleMemory[],
  coupleCode?: string
): Promise<void> => {
  const code = (coupleCode || getActiveCoupleCode()).trim().toUpperCase();
  const coupleRef = doc(db, 'couples', code);
  await setDoc(
    coupleRef,
    {
      coupleCode: code,
      memories: sanitizeForFirestore(memories),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
};
