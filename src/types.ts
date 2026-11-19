export interface ChapterItem {
  id?: string;
  title: string;
  slug: string;
  url: string;
  releaseDate?: string;
}

export interface WebtoonItem {
  title: string;
  slug: string;
  url: string;
  thumbnail: string;
  rating?: string;
  latestChapter?: {
    title: string;
    slug: string;
    url: string;
  };
}

export interface WebtoonDetail {
  title: string;
  slug: string;
  url: string;
  thumbnail: string;
  alternativeTitles?: string;
  authors: string[];
  artists: string[];
  genres: string[];
  status: string;
  rating?: string;
  synopsis: string;
  totalChapters: number;
  chapters: ChapterItem[];
}

export interface ChapterDetail {
  slug: string;
  chapterSlug: string;
  title: string;
  prevChapter?: string;
  nextChapter?: string;
  totalImages: number;
  images: string[];
}

export type AdultFilter = 'all' | 'none' | 'only' | '0' | '1';

export interface FilterOptions {
  page?: number;
  orderby?: 'latest' | 'alphabet' | 'rating' | 'trending' | 'views' | 'new-manga';
  genre?: string;
  status?: string;
  adult?: AdultFilter;
}

export interface PaginationInfo {
  currentPage: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
  totalPages?: number;
}

export interface ScrapedListResult {
  pagination: PaginationInfo;
  items: WebtoonItem[];
}
