import { fetchAndNormalizeFeeds } from '../aggregator';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Feed Aggregator', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch, parse, and filter feed items within past 24 hours', async () => {
    // Mock response data
    const mockGoogleNewsRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Google News</title>
    <item>
      <title>Gemini 1.5 Released</title>
      <link>https://example.com/gemini</link>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <description>Google releases new version of Gemini</description>
      <source>Google Official</source>
    </item>
    <item>
      <title>Old Google News</title>
      <link>https://example.com/old-google</link>
      <pubDate>${new Date(Date.now() - 48 * 60 * 60 * 1000).toUTCString()}</pubDate>
      <description>This article is too old</description>
      <source>Google Blog</source>
    </item>
  </channel>
</rss>`;

    const mockHnRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Hacker News</title>
    <item>
      <title>Show HN: My New Startup</title>
      <link>https://news.ycombinator.com/item?id=123</link>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <description>Show HN text</description>
    </item>
  </channel>
</rss>`;

    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('google.com')) {
        return Promise.resolve({ data: mockGoogleNewsRss });
      }
      if (url.includes('ycombinator.com')) {
        return Promise.resolve({ data: mockHnRss });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const items = await fetchAndNormalizeFeeds();
    expect(items).toHaveLength(2); // 1 fresh Google, 1 fresh HN. Old Google filtered out.

    expect(items[0]).toEqual({
      title: 'Gemini 1.5 Released',
      link: 'https://example.com/gemini',
      source: 'Google Official',
      pubDate: expect.any(Date),
      description: 'Google releases new version of Gemini'
    });

    expect(items[1]).toEqual({
      title: 'Show HN: My New Startup',
      link: 'https://news.ycombinator.com/item?id=123',
      source: 'Hacker News',
      pubDate: expect.any(Date),
      description: 'Show HN text'
    });
  });
});
