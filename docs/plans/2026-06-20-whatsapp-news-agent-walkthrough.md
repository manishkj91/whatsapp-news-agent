# WhatsApp News Agent Walkthrough

We have successfully implemented the full on-demand WhatsApp News Agent in TypeScript, tested it locally, and pushed it to your public GitHub repository: `https://github.com/manishkj91/whatsapp-news-agent.git`.

## Changes Made & Codebase Structure

-   [NEW] [package.json](file:///Users/manishkj/.gemini/antigravity/scratch/whatsapp-news-agent/package.json): Added dependency setup for `@google/genai`, `twilio`, `express`, `axios`, `fast-xml-parser` and test scripts.
-   [NEW] [tsconfig.json](file:///Users/manishkj/.gemini/antigravity/scratch/whatsapp-news-agent/tsconfig.json): Configured TypeScript compiler to target ES2022 and compile code to `dist/`.
-   [NEW] [src/aggregator.ts](file:///Users/manishkj/.gemini/antigravity/scratch/whatsapp-news-agent/src/aggregator.ts): Fetches Google News RSS search query items and Hacker News RSS stories, filtering out articles older than 24 hours.
-   [NEW] [src/summarizer.ts](file:///Users/manishkj/.gemini/antigravity/scratch/whatsapp-news-agent/src/summarizer.ts): Connects to the Gemini API (`gemini-1.5-flash`) via the new `@google/genai` client SDK to synthesize the fresh stories into structured bullet points by category.
-   [NEW] [src/index.ts](file:///Users/manishkj/.gemini/antigravity/scratch/whatsapp-news-agent/src/index.ts): Defines the Express HTTP Server, sets up the `/webhook` endpoint, parses parameters, formats responses in XML TwiML block, and exports the app.
-   [NEW] [src/\_\_tests\_\_/aggregator.test.ts](file:///Users/manishkj/.gemini/antigravity/scratch/whatsapp-news-agent/src/__tests__/aggregator.test.ts): Unit tests for the RSS parsing and date filtering logic using mocked Axios responses.
-   [NEW] [src/\_\_tests\_\_/summarizer.test.ts](file:///Users/manishkj/.gemini/antigravity/scratch/whatsapp-news-agent/src/__tests__/summarizer.test.ts): Unit tests for the summarizer using mocked GoogleGenAI client response data.
-   [NEW] [src/\_\_tests\_\_/webhook.test.ts](file:///Users/manishkj/.gemini/antigravity/scratch/whatsapp-news-agent/src/__tests__/webhook.test.ts): Unit tests for the Express server route handler and TwiML XML formatting.

---

## Verification Results

We verified that the entire test suite passes successfully.

### Command Executed:
```bash
npm run test
```

### Test Suite Output:
```
PASS src/__tests__/summarizer.test.ts
PASS src/__tests__/aggregator.test.ts
PASS src/__tests__/webhook.test.ts

Test Suites: 3 passed, 3 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        2.013 s
```

---

## How to Test and Deploy Locally

### 1. Local Configuration
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
PORT=8080
```

### 2. Start Local Server
Run:
```bash
npm run build && node dist/index.js
```

### 3. Simulate Twilio Webhook
In another terminal, send a test POST request:
```bash
curl -X POST -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=news&From=whatsapp%3A%2B123456789" \
  http://127.0.0.1:8080/webhook
```
Expected output:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>*Top News Summary (Past 24h)*: ...</Message>
</Response>
```

---

## How to Deploy to Google Cloud Functions

To deploy this Node.js Express server to Google Cloud Functions, run the following command using the Google Cloud CLI (`gcloud`):

```bash
gcloud functions deploy whatsapp-news-agent-webhook \
  --runtime=nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point=app \
  --region=us-central1 \
  --set-env-vars="GEMINI_API_KEY=your_gemini_api_key,NODE_ENV=production"
```

Once deployed, copy the generated target URL (e.g. `https://us-central1-your-project.cloudfunctions.net/whatsapp-news-agent-webhook`) and paste it as the **Webhook URL** in your **Twilio WhatsApp Sandbox settings** (under the "When a message comes in" field).
