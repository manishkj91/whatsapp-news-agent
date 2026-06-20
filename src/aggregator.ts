import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: Date;
  description: string;
}

const FEEDS = {
  google: 'https://news.google.com/rss/search?q=Google+OR+Flipkart+OR+AI+OR+finance&hl=en-US&gl=US&ceid=US:en',
  hn: 'https://news.ycombinator.com/rss'
};

export async function fetchAndNormalizeFeeds(): Promise<NewsItem[]> {
  const parser = new XMLParser();
  const allItems: NewsItem[] = [];
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  for (const [source, url] of Object.entries(FEEDS)) {
    try {
      const response = await axios.get(url, { timeout: 8000 });
      const jsonObj = parser.parse(response.data);
      const items = jsonObj.rss?.channel?.item;

      if (!items) continue;

      const normalized = (Array.isArray(items) ? items : [items]).map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        source: source === 'hn' ? 'Hacker News' : (item.source || 'Google News'),
        pubDate: new Date(item.pubDate || Date.now()),
        description: item.description || ''
      }));

      // Filter to past 24h
      const freshItems = normalized.filter((item: any) => item.pubDate >= cutoffTime);
      allItems.push(...freshItems);
    } catch (error) {
      console.error(`Failed to fetch feed for ${source}:`, error);
      // Fail close/gracefully for single feeds - continue to next
    }
  }

  // Sort by publication date descending (most recent first) and limit to top 15 items
  return allItems
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, 15);
}
