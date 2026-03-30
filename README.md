# Shop Talk

Shop Talk is a voice support app for e-commerce order and return questions.

You speak to it, it listens, looks up the local order and policy data, and replies back with:
- audio
- text in the chat

Demo video:
- [Shop Talk demo](https://www.tella.tv/video/shop-talk-ai-voice-assistant-demo-1k3d)

## What it does

You can ask things like:
- Where is my order?
- Can I return this product?
- What is the refund policy?

The app uses a fixed local dataset for orders and policies, so those files are the source of truth for the answers.

## Setup

Install dependencies:

```bash
pnpm install
```

Run the app:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Other useful commands:

```bash
pnpm build
pnpm start
pnpm lint
```

## How it works

### API key

On the first screen, you paste in a Gemini API key.

The app:
- checks that the key looks valid
- sends it to `/api/live/validate`
- saves it in the current browser session if it works

The key is only stored in `sessionStorage`. It is not saved in a database.

### Voice chat

When the chat screen opens:
- the app asks the server for a short-lived Gemini Live token
- the browser connects directly to Gemini Live
- your microphone audio is streamed in
- Gemini replies with audio and transcript events
- the UI shows the transcript as a chat history

### Order and policy data

Gemini does not read the JSON files directly.

Instead:
- Gemini calls tools
- support-related tool calls go through `/api/support/tool`
- the server reads the local data and returns the result
- that result is sent back into the live session

There is also a local `request_end_chat` tool for the spoken closing flow.

## Design decisions and tradeoffs

### 1. I used a simple web UI

The task allowed a CLI, API, or simple UI. I went with a browser UI because voice input and voice output are much easier to use and review there.

Tradeoff:
- better demo experience
- more frontend and browser-audio work

### 2. The Gemini key is stored only for the current session

I used browser session storage so the app could stay simple and not need a full auth system.

Tradeoff:
- simple and good enough for this project
- not how I would handle secrets in a production app

### 3. The app uses local JSON as the source of truth

The order and policy data is local and the assistant reads it through app-owned tools.

Tradeoff:
- predictable and easy to verify
- not connected to a real backend

### 4. The model does not answer order questions on its own

For order, return, and policy questions, the model uses tools instead of just generating an answer from scratch.

Tradeoff:
- answers stay grounded in the dataset
- the live session flow is a bit more involved

### 5. The chat is continuous instead of push-to-talk

After `Start chat`, the app keeps the conversation live and handles turns based on silence and assistant responses.

Tradeoff:
- feels more natural
- needs careful handling for pauses, interruptions, and turn timing

## Assumptions

- This is a read-only assistant.
- It does not actually submit returns, refunds, cancellations, or account updates.
- The local dataset is the source of truth for answers.
- The text chat is there mainly to show the voice conversation history.

## Project structure

```text
src/
  app/
  components/
  data/
  hooks/
  lib/
```

Main files:
- `src/components/setup/setup-screen.tsx`
- `src/components/chat/chat-screen.tsx`
- `src/hooks/use-live-session.ts`
- `src/lib/live/config.ts`
- `src/lib/support/service.ts`

## Verification

Checks run on the codebase:

```bash
pnpm lint
pnpm build
```

Manual checks to do:
- API key validation
- chat connection
- microphone selection
- transcript rendering
- assistant audio playback
- support answers from the local dataset
- spoken closing flow

## Limitations

- The app uses local demo data, not a real database.
- It currently works with live microphone input, not uploaded audio files.
- Turn detection is based on silence, so it may still need tuning.
- The quality of the live session depends on browser media permissions and Gemini Live behavior.
- Spoken closing depends on Gemini calling the local close tool correctly.

## Improvements

- connect it to a real backend or database
- improve turn detection and interruption handling
- improve reconnect and session resumption
- add more support tools
- add automated tests for the important flows
- support audio file input as well as live microphone input
