import { generateNewsSummary } from '../summarizer';
import { NewsItem } from '../aggregator';

// Mock the @google/genai module
const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: mockGenerateContent
        }
      };
    })
  };
});

describe('News Summarizer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('should return default message if news items array is empty', async () => {
    const summary = await generateNewsSummary([]);
    expect(summary).toBe('No news found in the last 24 hours matching your interests.');
  });

  it('should return mock message if GEMINI_API_KEY is not defined', async () => {
    delete process.env.GEMINI_API_KEY;
    const summary = await generateNewsSummary([{
      title: 'Google launches Gemini 1.5 Pro',
      link: 'https://google.com',
      source: 'Google News',
      pubDate: new Date(),
      description: 'New model'
    }]);
    expect(summary).toContain('Mock Summary: API key missing');
  });

  it('should call Gemini API and return summarized content if API key is defined', async () => {
    process.env.GEMINI_API_KEY = 'test-api-key';
    mockGenerateContent.mockResolvedValue({
      text: '*Tech & AI*\n• Google announced new model updates.'
    });

    const mockItems: NewsItem[] = [
      {
        title: 'Google launches Gemini 1.5 Pro',
        link: 'https://google.com',
        source: 'Google News',
        pubDate: new Date(),
        description: 'New model update'
      }
    ];

    const summary = await generateNewsSummary(mockItems);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-3.5-flash',
      contents: expect.stringContaining('Google launches Gemini 1.5 Pro')
    });
    expect(summary).toBe('*Tech & AI*\n• Google announced new model updates.');
  });
});
