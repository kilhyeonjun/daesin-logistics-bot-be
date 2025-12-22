import type { Route } from '../entities/Route.js';

export interface CrawlOptions {
  lineStart?: string;
  lineEnd?: string;
  lineName?: string;
  terminalCode?: string;
  searchOpt?: '1' | '2' | '3';
}

export interface ICrawler {
  crawl(searchDate: string, options?: CrawlOptions): Promise<Route[]>;
}
