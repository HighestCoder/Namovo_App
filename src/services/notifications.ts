import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, SchedulableTriggerInputTypes } from 'expo-notifications';

// Configuração do handler global de notificações (Foreground & Background)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Solicita permissões para envio de notificações no dispositivo
 */
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      } catch (err) {
        console.warn('Erro ao solicitar permissão de notificação Web:', err);
      }
    }
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Permissão para notificações não foi concedida');
      return null;
    }

    // Configuração de canal para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('namovo-channel', {
        name: 'Notificações Namovo',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C68B59',
        sound: 'default',
      });
    }

    return 'notifications-granted';
  } catch (error) {
    console.warn('Erro ao configurar notificações Expo:', error);
    return null;
  }
};

/**
 * Notificação Web auxiliar para fallback quando rodando em navegador
 */
const triggerWebNotificationFallback = (title: string, body: string) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.png',
        });
      } catch (err) {
        console.warn('Falha ao instanciar Notification web:', err);
      }
    }
  }
};

/**
 * 1. Cartas: Dispara notificação push/local quando uma carta ou mensagem é enviada
 */
export const triggerPartnerMessageNotification = async (
  senderName: string,
  messageText: string
) => {
  const title = `${senderName} te enviou uma carta ❤️`;
  const body = messageText.length > 80 ? `${messageText.substring(0, 77)}...` : messageText;

  if (Platform.OS === 'web') {
    triggerWebNotificationFallback(title, body);
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: { type: 'chat_message', senderName },
      },
      trigger: null, // Dispara imediatamente
    });
  } catch (err) {
    console.warn('Erro ao disparar notificação de carta:', err);
  }
};

/**
 * 2. Calendário: Agenda lembrete para uma data marcada e emite confirmação imediata
 */
export const scheduleCalendarReminder = async (
  eventTitle: string,
  dateStr: string, // YYYY-MM-DD
  timeStr?: string, // HH:MM
  emoji: string = '🗓️'
) => {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  let hours = 9;
  let minutes = 0;
  if (timeStr && timeStr.includes(':')) {
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
    if (!isNaN(h)) hours = h;
    if (!isNaN(m)) minutes = m;
  }

  const targetDate = new Date(year, month, day, hours, minutes, 0);
  const isFuture = targetDate.getTime() > Date.now();

  const formattedDisplay = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;
  const immediateTitle = `Compromisso Agendado! ${emoji}`;
  const immediateBody = `"${eventTitle}" foi marcado para ${formattedDisplay}${timeStr ? ` às ${timeStr}` : ''}.`;

  if (Platform.OS === 'web') {
    triggerWebNotificationFallback(immediateTitle, immediateBody);
    return;
  }

  try {
    // Alerta imediato de confirmação
    await Notifications.scheduleNotificationAsync({
      content: {
        title: immediateTitle,
        body: immediateBody,
        sound: 'default',
        data: { type: 'calendar_created', eventTitle, dateStr },
      },
      trigger: null,
    });

    // Se a data for futura, agenda o lembrete programado
    if (isFuture) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Lembrete de Encontro ${emoji}`,
          body: `Hoje é o dia de: "${eventTitle}"! Prepare-se com carinho ❤️`,
          sound: 'default',
          data: { type: 'calendar_reminder', eventTitle, dateStr },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: targetDate,
        },
      });
    }
  } catch (err) {
    console.warn('Erro ao agendar lembrete do calendário:', err);
  }
};

/**
 * 3. Presentes: Alerta sutil quando uma nova ideia de presente é adicionada
 */
export const triggerNewGiftNotification = async (
  giftName: string,
  targetPartner?: string
) => {
  const title = 'Nova Ideia de Presente Salva 🎁';
  const body = targetPartner && targetPartner !== 'all'
    ? `"${giftName}" foi adicionado com carinho à lista de desejos de ${targetPartner}!`
    : `"${giftName}" foi adicionado à lista de desejos do casal!`;

  if (Platform.OS === 'web') {
    triggerWebNotificationFallback(title, body);
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: { type: 'gift_created', giftName },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Erro ao disparar notificação de presente:', err);
  }
};

/**
 * 4. Pareamento: Alerta de comemoração quando o código de casal é gerado ou inserido
 */
export const triggerPairingSuccessNotification = async (coupleCode: string) => {
  const title = 'Vocês estão conectados! ❤️';
  const body = `Código do Casal [${coupleCode}] sincronizado com sucesso neste dispositivo.`;

  if (Platform.OS === 'web') {
    triggerWebNotificationFallback(title, body);
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: { type: 'couple_paired', coupleCode },
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Erro ao disparar notificação de pareamento:', err);
  }
};
