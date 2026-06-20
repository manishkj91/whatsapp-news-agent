import { GoogleGenAI } from '@google/genai';
import { NewsItem } from './aggregator';

export async function generateNewsSummary(items: NewsItem[]): Promise<string> {
  if (items.length === 0) {
    return 'No news found in the last 24 hours matching your interests.';
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('Generating ephemeral/mock summary because GEMINI_API_KEY is not configured.');
    return 'Mock Summary: API key missing. Please configure GEMINI_API_KEY.';
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Format articles for prompt
  const articleList = items.map((item, index) => 
    `[${index + 1}] Title: ${item.title}\nSource: ${item.source}\nLink: ${item.link}\nDescription: ${item.description}\n`
  ).join('\n');

  const prompt = `
You are a daily digest assistant. Below is a list of news articles collected over the past 24 hours.
Your task is to synthesize these articles into a concise, well-structured, WhatsApp-friendly news update.

Follow these rules:
1. Group news into three categories: *Tech & AI*, *Google & Flipkart*, and *Finance & Markets*.
2. For each category, write 2-3 summarized bullet points highlighting the most important stories.
3. Keep the summary bullet points extremely brief and high-value (one line per bullet point).
4. Do not list duplicate or minor stories.
5. Use WhatsApp markdown styling: bold text using asterisks like *this*, and start bullets with standard emoji indicators.
6. Under each bullet, you can optionally include the source link in parentheses like (source: link) if it's a major story.
7. Keep the entire response under 600 characters to fit well in a single WhatsApp screen.

Articles list:
${articleList}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt
    });

    return response.text || 'Failed to generate summary content.';
  } catch (error) {
    console.error('Failed to call Gemini API:', error);
    throw new Error('Summarizer failed to retrieve summary.');
  }
}
