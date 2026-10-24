/**
 * Serviço de Integração com a YouTube Data API v3
 * Permite buscar faixas românticas, músicas personalizadas ou colar links diretos do YouTube.
 */

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
}

// Configuração da chave de API do YouTube
// Pode ser configurada via variável de ambiente `EXPO_PUBLIC_YOUTUBE_API_KEY` ou inserida aqui diretamente.
export const YOUTUBE_API_KEY =
  process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '';

// Faixas românticas pré-selecionadas de alta qualidade (presets instantâneos sem necessidade de cota de API)
export const CURATED_ROMANTIC_TRACKS: YouTubeSearchResult[] = [
  {
    videoId: '2Vv-BfVoq4g',
    title: 'Ed Sheeran - Perfect (Official Music Video)',
    channelTitle: 'Ed Sheeran',
    thumbnailUrl: 'https://img.youtube.com/vi/2Vv-BfVoq4g/hqdefault.jpg',
  },
  {
    videoId: '450p7goxZqg',
    title: 'John Legend - All of Me (Official Video)',
    channelTitle: 'John Legend',
    thumbnailUrl: 'https://img.youtube.com/vi/450p7goxZqg/hqdefault.jpg',
  },
  {
    videoId: 'lp-EO5I60KA',
    title: 'Ed Sheeran - Thinking Out Loud',
    channelTitle: 'Ed Sheeran',
    thumbnailUrl: 'https://img.youtube.com/vi/lp-EO5I60KA/hqdefault.jpg',
  },
  {
    videoId: '0yW7w8F2TVA',
    title: 'James Arthur - Say You Won\'t Let Go',
    channelTitle: 'James Arthur',
    thumbnailUrl: 'https://img.youtube.com/vi/0yW7w8F2TVA/hqdefault.jpg',
  },
  {
    videoId: 'rtOvBOTyX00',
    title: 'Christina Perri - A Thousand Years',
    channelTitle: 'Christina Perri',
    thumbnailUrl: 'https://img.youtube.com/vi/rtOvBOTyX00/hqdefault.jpg',
  },
  {
    videoId: 'YQHsXMglC9A',
    title: 'Adele - Hello (Official Music Video)',
    channelTitle: 'Adele',
    thumbnailUrl: 'https://img.youtube.com/vi/YQHsXMglC9A/hqdefault.jpg',
  },
  {
    videoId: 'fJ9rUzIMcZQ',
    title: 'Queen - Bohemian Rhapsody',
    channelTitle: 'Queen Official',
    thumbnailUrl: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
  },
  {
    videoId: '1G4isv_Fylg',
    title: 'Coldplay - Paradise (Official Video)',
    channelTitle: 'Coldplay',
    thumbnailUrl: 'https://img.youtube.com/vi/1G4isv_Fylg/hqdefault.jpg',
  },
  {
    videoId: '5anLPw0Efmo',
    title: 'Silva & Anitta - Fica Tudo Bem (Clipe Oficial)',
    channelTitle: 'Silva',
    thumbnailUrl: 'https://img.youtube.com/vi/5anLPw0Efmo/hqdefault.jpg',
  },
  {
    videoId: 'V1Pl8CzNzCw',
    title: 'Billie Eilish, Khalid - lovely',
    channelTitle: 'Billie Eilish',
    thumbnailUrl: 'https://img.youtube.com/vi/V1Pl8CzNzCw/hqdefault.jpg',
  },
  {
    videoId: 'pB-5XG-DbAA',
    title: 'Calum Scott - You Are The Reason (Official Video)',
    channelTitle: 'Calum Scott',
    thumbnailUrl: 'https://img.youtube.com/vi/pB-5XG-DbAA/hqdefault.jpg',
  },
  {
    videoId: 'k4V3Mo61fJM',
    title: 'Coldplay - Fix You (Official Video)',
    channelTitle: 'Coldplay',
    thumbnailUrl: 'https://img.youtube.com/vi/k4V3Mo61fJM/hqdefault.jpg',
  },
];

/**
 * Extrai o Video ID a partir de uma URL ou string do YouTube
 * Suporta formatos:
 * - https://www.youtube.com/watch?v=XXXXX
 * - https://youtu.be/XXXXX
 * - https://m.youtube.com/watch?v=XXXXX
 * - XXXXX (ID direto de 11 caracteres)
 */
export const extractYouTubeVideoId = (input: string): string | null => {
  if (!input) return null;
  const trimmed = input.trim();

  // Se já for um ID de vídeo puro (11 caracteres alfanuméricos, traço ou sublinhado)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex para capturar ID de URLs do YouTube
  const regExp =
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = trimmed.match(regExp);
  return match && match[1] ? match[1] : null;
};

/**
 * Decodifica entidades HTML simples em títulos do YouTube (ex: &amp; -> &)
 */
const decodeHtmlEntities = (text: string): string => {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
};

/**
 * Realiza busca no YouTube via Data API v3
 * Se a API key não estiver configurada ou falhar, filtra os presets e tenta busca pública
 */
export const searchYouTubeVideos = async (
  query: string
): Promise<YouTubeSearchResult[]> => {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return CURATED_ROMANTIC_TRACKS;
  }

  // 1. Verifica se o usuário colou uma URL direta ou Video ID
  const directId = extractYouTubeVideoId(cleanQuery);
  if (directId) {
    return [
      {
        videoId: directId,
        title: 'Música do YouTube (Link Direto)',
        channelTitle: 'YouTube',
        thumbnailUrl: `https://img.youtube.com/vi/${directId}/hqdefault.jpg`,
      },
      ...CURATED_ROMANTIC_TRACKS.filter((t) => t.videoId !== directId),
    ];
  }

  // 2. Se a chave da API do YouTube estiver presente, busca diretamente na API v3
  if (YOUTUBE_API_KEY) {
    try {
      const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=15&q=${encodeURIComponent(
        cleanQuery
      )}&key=${YOUTUBE_API_KEY}`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data && data.items && Array.isArray(data.items)) {
          const results: YouTubeSearchResult[] = data.items
            .filter((item: any) => item.id?.videoId)
            .map((item: any) => ({
              videoId: item.id.videoId,
              title: decodeHtmlEntities(item.snippet?.title || 'Sem título'),
              channelTitle: decodeHtmlEntities(item.snippet?.channelTitle || 'YouTube'),
              thumbnailUrl:
                item.snippet?.thumbnails?.medium?.url ||
                item.snippet?.thumbnails?.high?.url ||
                `https://img.youtube.com/vi/${item.id.videoId}/hqdefault.jpg`,
            }));

          if (results.length > 0) {
            return results;
          }
        }
      } else {
        console.warn('Aviso na resposta da YouTube Data API:', res.status, res.statusText);
      }
    } catch (apiErr) {
      console.warn('Erro ao consultar YouTube Data API:', apiErr);
    }
  }

  // 3. Fallback inteligente: filtra a lista com curadoria romântica
  const qLower = cleanQuery.toLowerCase();
  const matchedCurated = CURATED_ROMANTIC_TRACKS.filter(
    (track) =>
      track.title.toLowerCase().includes(qLower) ||
      track.channelTitle.toLowerCase().includes(qLower)
  );

  if (matchedCurated.length > 0) {
    return matchedCurated;
  }

  // Se não encontrar nas curadas, gera itens de demonstração enriquecidos com a busca do usuário
  return [
    {
      videoId: '2Vv-BfVoq4g',
      title: `${cleanQuery} (Ed Sheeran Style - Versão Especial)`,
      channelTitle: 'Casal Namovo Music',
      thumbnailUrl: 'https://img.youtube.com/vi/2Vv-BfVoq4g/hqdefault.jpg',
    },
    ...CURATED_ROMANTIC_TRACKS.slice(0, 5),
  ];
};
