export interface CoupleData {
  partner1: string;
  partner2: string;
  startDate: string; // ISO format: YYYY-MM-DD
  featuredImage?: string;
  featuredCaption?: string;
  createdAt?: number;
}

export interface TimeTogether {
  years: number;
  months: number;
  weeks: number;
  days: number;
  totalDays: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export type ActiveCornerModal =
  | 'roulette'
  | 'travels'
  | 'memories'
  | 'settings'
  | 'gallery'
  | 'calendar'
  | 'gifts'
  | null;

export interface CalendarEvent {
  id: string;
  date: string; // Formato YYYY-MM-DD
  title: string;
  emoji: string;
  time?: string;
  note?: string;
  createdAt: number;
}

export interface GiftIdea {
  id: string;
  name: string;
  link?: string;
  notes?: string;
  forPartner?: string;
  isPurchased?: boolean;
  createdAt: number;
}

export interface RouletteLocation {
  id: string;
  name: string;
  emoji: string;
  photoUrl?: string;
  visitedAt?: string;
}

export interface Trip {
  id: string;
  destination: string;
  date: string;
  photos: string[];
  caption: string;
  emoji: string;
}

export interface CoupleMemory {
  id: string;
  title: string;
  content: string;
  date: string;
  tag?: string;
}
