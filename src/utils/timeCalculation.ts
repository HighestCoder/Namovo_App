import { TimeTogether } from '../types';

/**
 * Calcula o tempo decorrido com precisão de calendário entre a data de início e o momento atual.
 * Retorna Anos, Meses, Semanas e Dias exatos.
 */
export function calculateTimeTogether(startDateStr: string, now: Date = new Date()): TimeTogether {
  // Parse date string (suporta YYYY-MM-DD ou data com hora zerada)
  const [year, month, day] = startDateStr.split('-').map(Number);
  const start = new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);

  if (isNaN(start.getTime()) || start > now) {
    return {
      years: 0,
      months: 0,
      weeks: 0,
      days: 0,
      totalDays: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  // Contagem progressiva exata de calendário
  let current = new Date(start.getTime());

  // 1. Anos completos
  let years = 0;
  while (true) {
    const nextYear = new Date(current);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    if (nextYear <= now) {
      years++;
      current = nextYear;
    } else {
      break;
    }
  }

  // 2. Meses completos restantes
  let months = 0;
  while (true) {
    const nextMonth = new Date(current);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    if (nextMonth <= now) {
      months++;
      current = nextMonth;
    } else {
      break;
    }
  }

  // 3. Dias totais restantes até agora
  const diffMillis = now.getTime() - current.getTime();
  const remainingTotalDays = Math.floor(diffMillis / (1000 * 60 * 60 * 24));

  // 4. Semanas e Dias
  const weeks = Math.floor(remainingTotalDays / 7);
  const days = remainingTotalDays % 7;

  // 5. Horas, minutos e segundos restantes
  const totalDiffMillis = Math.max(0, now.getTime() - start.getTime());
  const totalDays = Math.floor(totalDiffMillis / (1000 * 60 * 60 * 24));
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  return {
    years,
    months,
    weeks,
    days,
    totalDays,
    hours,
    minutes,
    seconds,
  };
}

/**
 * Converte data DD/MM/AAAA para formato ISO YYYY-MM-DD com validação
 */
export function parseDateInputToISO(input: string): string | null {
  const cleaned = input.replace(/\D/g, '');
  if (cleaned.length !== 8) return null;

  const day = parseInt(cleaned.substring(0, 2), 10);
  const month = parseInt(cleaned.substring(2, 4), 10);
  const year = parseInt(cleaned.substring(4, 8), 10);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1920 || year > 2100) return null;

  // Verifica se o dia é válido para o mês específico
  const testDate = new Date(year, month - 1, day);
  if (
    testDate.getFullYear() !== year ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day
  ) {
    return null;
  }

  // Não permitir data no futuro
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (testDate > today) {
    return null;
  }

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Aplica máscara DD/MM/AAAA enquanto o usuário digita
 */
export function applyDateMask(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

/**
 * Formata ISO YYYY-MM-DD para exibição elegante em português (ex: "12 de Maio de 2021")
 */
export function formatElegantDate(isoString: string): string {
  if (!isoString) return '';
  const [year, month, day] = isoString.split('-').map(Number);
  if (!year || !month || !day) return isoString;

  const monthsPt = [
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

  return `${day} de ${monthsPt[month - 1]} de ${year}`;
}

/**
 * Converte ISO YYYY-MM-DD para DD/MM/AAAA
 */
export function isoToDisplayDate(isoString: string): string {
  if (!isoString) return '';
  const [year, month, day] = isoString.split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

/**
 * Calcula quantos dias faltam para o próximo mesversário ou aniversário anual do casal.
 */
export function getNextMilestoneInfo(startDateStr: string, now: Date = new Date()): string {
  if (!startDateStr) return '';
  const [year, month, day] = startDateStr.split('-').map(Number);
  if (!year || !month || !day) return '';

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Se hoje é exatamente o dia do mês do início
  if (today.getDate() === day) {
    if (today.getMonth() + 1 === month && today.getFullYear() > year) {
      const yearsCount = today.getFullYear() - year;
      return `🎉 Feliz ${yearsCount} ${yearsCount === 1 ? 'ano' : 'anos'} juntos hoje!`;
    }
    return '✨ Feliz mesversário para nós hoje!';
  }

  // Calcula a próxima data mensal (dia 'day')
  let nextDate = new Date(today.getFullYear(), today.getMonth(), day);
  if (nextDate <= today) {
    nextDate = new Date(today.getFullYear(), today.getMonth() + 1, day);
  }

  const diffTime = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Verifica se o próximo marco é um aniversário anual
  if (nextDate.getMonth() + 1 === month) {
    const nextYears = nextDate.getFullYear() - year;
    return `Faltam ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} para ${nextYears} ${nextYears === 1 ? 'ano' : 'anos'}`;
  }

  return `Faltam ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} para o próximo mês`;
}

