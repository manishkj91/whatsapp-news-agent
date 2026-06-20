import { fetchAndNormalizeFeeds } from '../aggregator';
import { generateNewsSummary } from '../summarizer';

jest.mock('../aggregator', () => {
  return {
    fetchAndNormalizeFeeds: jest.fn()
  };
});

jest.mock('../summarizer', () => {
  return {
    generateNewsSummary: jest.fn()
  };
});

const mockFetch = fetchAndNormalizeFeeds as jest.Mock;
const mockSummarize = generateNewsSummary as jest.Mock;

describe('Webhook Server Endpoint', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    mockFetch.mockReset();
    mockSummarize.mockReset();

    req = {
      body: {
        Body: 'news',
        From: 'whatsapp:+123456789'
      },
      headers: {}
    };

    res = {
      type: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  it('should respond with TwiML containing the summarized news', async () => {
    mockFetch.mockResolvedValue([{ title: 'Google News', link: 'https://example.com', source: 'Google', pubDate: new Date(), description: 'details' }]);
    mockSummarize.mockResolvedValue('*Tech*\n• news bullet');

    const { app } = require('../index');
    const webhookRoute = app._router.stack.find((layer: any) => layer.route && layer.route.path === '/webhook');
    expect(webhookRoute).toBeDefined();

    const handler = webhookRoute.route.stack[webhookRoute.route.stack.length - 1].handle;
    await handler(req, res);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockSummarize).toHaveBeenCalledTimes(1);
    expect(res.type).toHaveBeenCalledWith('text/xml');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('<Response>'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('<Message>*Tech*\n• news bullet</Message>'));
  });

  it('should return a friendly error message in TwiML if feed fetching fails', async () => {
    mockFetch.mockRejectedValue(new Error('Feed error'));

    const { app } = require('../index');
    const webhookRoute = app._router.stack.find((layer: any) => layer.route && layer.route.path === '/webhook');
    const handler = webhookRoute.route.stack[webhookRoute.route.stack.length - 1].handle;
    await handler(req, res);

    expect(res.type).toHaveBeenCalledWith('text/xml');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('<Response>'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('<Message>Sorry, I had trouble fetching the news. Please try again later.</Message>'));
  });
});
