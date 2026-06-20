import express, { Request, Response } from 'express';
import { fetchAndNormalizeFeeds } from './aggregator';
import { generateNewsSummary } from './summarizer';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Helper to sanitize and encode outputs to prevent XML injection
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Twilio request validation middleware (optional but highly recommended for production)
const validateTwilioRequest = (req: Request, res: Response, next: any) => {
  const twilioSignature = req.headers['x-twilio-signature'] as string;
  const url = process.env.PUBLIC_URL || '';
  const token = process.env.TWILIO_AUTH_TOKEN || '';
  const params = req.body;

  if (process.env.NODE_ENV === 'development' || !twilioSignature || !token) {
    // Skip signature check in dev mode or if auth token is not supplied
    return next();
  }

  // TODO(security): Strict verification for production webhooks
  const isValid = twilio.validateRequest(token, twilioSignature, url, params);
  if (!isValid) {
    return res.status(403).send('Forbidden: Twilio validation failed.');
  }
  next();
};

app.post('/webhook', validateTwilioRequest, async (req: Request, res: Response) => {
  const incomingMessage = (req.body.Body || '').trim().toLowerCase();
  console.log(`Received WhatsApp command: "${incomingMessage}" from ${req.body.From}`);

  try {
    // 1. Fetch news
    console.log('Starting RSS feed aggregation...');
    const items = await fetchAndNormalizeFeeds();
    console.log(`Successfully fetched and parsed ${items.length} news items.`);
    
    // 2. Generate summary using Gemini
    console.log('Calling Gemini API to synthesize summary...');
    const summary = await generateNewsSummary(items);
    console.log('Gemini summary generation complete.');
    
    // 3. Format as TwiML response
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${escapeXml(summary)}</Message>
</Response>`);
  } catch (error) {
    console.error('Webhook execution failed:', error);
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Sorry, I had trouble fetching the news. Please try again later.</Message>
</Response>`);
  }
});

const PORT = Number(process.env.PORT) || 8080;
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Local news agent server listening on http://127.0.0.1:${PORT}`);
  });
}

// Export app for serverless engine
export { app };
