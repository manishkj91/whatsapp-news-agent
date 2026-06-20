import express, { Request, Response } from 'express';
import { fetchAndNormalizeFeeds } from './aggregator';
import { generateNewsSummary } from './summarizer';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

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

// Async worker function to process the news summary and send outbound message
async function processAndSendNews(fromNumber: string, toNumber: string) {
  try {
    console.log('Starting async RSS feed aggregation...');
    const items = await fetchAndNormalizeFeeds();
    console.log(`Successfully fetched and parsed ${items.length} news items.`);

    console.log('Calling Gemini API to synthesize summary...');
    const summary = await generateNewsSummary(items);
    console.log('Gemini summary generation complete.');

    console.log(`Sending WhatsApp message to ${fromNumber} from ${toNumber}...`);
    await twilioClient.messages.create({
      body: summary,
      from: toNumber,
      to: fromNumber
    });
    console.log('WhatsApp message delivered successfully.');
  } catch (error) {
    console.error('Failed to process and send news in background:', error);
    try {
      // Send error alert to user
      await twilioClient.messages.create({
        body: 'Sorry, I had trouble generating your news digest. Please try again later.',
        from: toNumber,
        to: fromNumber
      });
    } catch (sendError) {
      console.error('Failed to send error notification via Twilio:', sendError);
    }
  }
}

app.post('/webhook', validateTwilioRequest, async (req: Request, res: Response) => {
  const incomingMessage = (req.body.Body || '').trim().toLowerCase();
  const fromNumber = req.body.From; // e.g. whatsapp:+919167030145
  const toNumber = req.body.To;     // e.g. whatsapp:+14155238886

  console.log(`Received WhatsApp command: "${incomingMessage}" from ${fromNumber}`);

  // Return immediate response to Twilio (under 1 second) to prevent timeout
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Fetching your news digest... ⏳</Message>
</Response>`);

  // Trigger background task asynchronously without awaiting it
  processAndSendNews(fromNumber, toNumber);
});

const PORT = Number(process.env.PORT) || 8080;
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Local news agent server listening on http://127.0.0.1:${PORT}`);
  });
}

// Export app for serverless engine
export { app };
