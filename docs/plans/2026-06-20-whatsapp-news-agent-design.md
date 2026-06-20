# WhatsApp News Agent Design

**Date:** 2026-06-20  
**Status:** Approved  
**Platform:** Google Cloud Functions (GCP) + Twilio WhatsApp Sandbox + Gemini API

## Overview
A serverless Node.js/TypeScript application deployed to Google Cloud Functions. It functions as an interactive WhatsApp bot. When the user sends a message (e.g., "news") to the Twilio WhatsApp Sandbox number, Twilio invokes this Cloud Function via a webhook. The function aggregates top news for specified topics, summarizes them using the Gemini API, and replies directly to the WhatsApp user.

## Objectives & Interests
- **Topics of Interest:** Tech & AI, Finance/Markets, and company-specific mentions (Google, Flipkart).
- **Triggers:** On-demand (whenever the user messages the WhatsApp bot).
- **Delivery:** Direct response on WhatsApp via Twilio.

## Architecture

```
[User on WhatsApp]
       │
       ▼ (Sends message)
 [Twilio Sandbox]
       │
       ▼ (HTTP POST Webhook)
[GCP Cloud Function]
       │
       ├─► [Fetches RSS Feeds: Google News RSS (Google, Flipkart, AI, Finance) + HN RSS]
       ├─► [Filters articles to past 24 hours]
       ├─► [Sends content to Gemini API (gemini-1.5-flash) for summarization]
       │
       ▼ (Responds with TwiML XML)
 [Twilio Sandbox]
       │
       ▼ (Delivers message)
[User on WhatsApp]
```

## Component Details

### 1. Webhook Entry Point (`index.ts`)
- Listens for incoming HTTP POST requests from Twilio.
- Authenticates the request (optional, via Twilio signature validation).
- Extracts the message body (to support commands like "news" or custom topics).
- Triggers the pipeline and returns the synthesized summary in a TwiML `<Response>` block.

### 2. Aggregator (`aggregator.ts`)
- Fetches Google News RSS feeds for search queries:
  - `Google`
  - `Flipkart`
  - `AI OR "Artificial Intelligence"`
  - `Finance OR Stocks OR Markets`
- Fetches Hacker News Top Stories RSS feed.
- Parases XML feeds, extracts title, link, publisher, and publication date.
- Filters out items older than 24 hours to ensure freshness.

### 3. Summarizer (`summarizer.ts`)
- Formats the aggregated news items into a text prompt.
- Sends the prompt to `gemini-1.5-flash` using `@google/genai` (Google's official SDK).
- Instructs Gemini to deduplicate articles, organize them by category, and generate a concise bulleted summary formatted with WhatsApp markdown (`*bold*`, emojis).

### 4. Response formatter (`formatter.ts`)
- Packages the summary text into TwiML format.
- Example response:
  ```xml
  <Response>
      <Message>*Top News Summary (Past 24h)*:
      
*Tech & AI:*
• ...
*Google & Flipkart:*
• ...
      </Message>
  </Response>
  ```

## Security & Configuration
- Store API keys and credentials securely using Cloud Secret Manager or environment variables:
  - `GEMINI_API_KEY`: Google AI Studio API Key.
  - `TWILIO_AUTH_TOKEN`: Used to validate Twilio signatures (optional).
