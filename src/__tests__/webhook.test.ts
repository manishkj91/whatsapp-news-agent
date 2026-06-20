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

const mockCreate = jest.fn();
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => {
    return {
      messages: {
        create: mockCreate
      }
    };
  });
});

const mockFetch = fetchAndNormalizeFeeds as jest.Mock;
const mockSummarize = generateNewsSummary as jest.Mock;

describe('Webhook Server Endpoint', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    mockFetch.mockReset();
    mockSummarize.mockReset();
    mockCreate.mockReset();

    req = {
      body: {
        Body: 'news',
        From: 'whatsapp:+919167030145',
        To: 'whatsapp:+14155238886'
      },
      headers: {}
    };

    res = {
      type: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  it('should respond immediately with a loading message TwiML response', async () => {
    mockFetch.mockResolvedValue([]);
    mockSummarize.mockResolvedValue('Summary');

    const { app } = require('../index');
    const webhookRoute = app._router.stack.find((layer: any) => layer.route && layer.route.path === '/webhook');
    expect(webhookRoute).toBeDefined();

    const handler = webhookRoute.route.stack[webhookRoute.route.stack.length - 1].handle;
    await handler(req, res);

    // Verify immediate response
    expect(res.type).toHaveBeenCalledWith('text/xml');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('<Response>'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('<Message>Fetching your news digest... ⏳</Message>'));

    // Wait a brief tick to let the background async worker execute
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockSummarize).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      body: 'Summary',
      from: 'whatsapp:+14155238886',
      to: 'whatsapp:+919167030145'
    });
  });

  it('should send a WhatsApp error notification if background processing fails', async () => {
    mockFetch.mockRejectedValue(new Error('Feed error'));

    const { app } = require('../index');
    const webhookRoute = app._router.stack.find((layer: any) => layer.route && layer.route.path === '/webhook');
    const handler = webhookRoute.route.stack[webhookRoute.route.stack.length - 1].handle;
    await handler(req, res);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockCreate).toHaveBeenCalledWith({
      body: 'Sorry, I had trouble generating your news digest. Please try again later.',
      from: 'whatsapp:+14155238886',
      to: 'whatsapp:+919167030145'
    });
  });
});
