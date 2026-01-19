# Voice Agent - Interview Orchestration Platform

A web application that orchestrates a 3-agent conversation and evaluation workflow, deployable on the Vercel free plan.

## Overview

This app runs interview-style conversations with three AI agents:

- **Agent A (Interviewer)**: Conducts the interview by asking an initial question and follow-ups until it has gathered enough information
- **Agent B (Simulated Persona)**: In simulation mode, answers Agent A's questions based on a configurable profile
- **Agent C (Evaluator)**: Evaluates the interview transcript, scoring Agent A's follow-up question quality

### Two Modes

1. **Human Mode**: You chat directly with Agent A, answering its questions
2. **Simulation Mode**: Agent A and Agent B converse automatically, with Agent B playing a configured persona

## Features

- Real-time chat interface for Human Mode
- Auto-running simulation with live transcript view
- Editable and versionable prompts for all three agents
- Uploadable Agent B profiles (JSON/YAML personas)
- Run history with searchable transcript and evaluation results
- Detailed evaluation with scores, subscores, strengths, weaknesses, and evidence

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **LLM**: OpenAI GPT-4o
- **Storage**: Vercel Blob (free tier compatible)

## Local Development

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- OpenAI API key

### Setup

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd voice-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Edit `.env.local` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-openai-api-key
   ```

5. For local development with Vercel Blob, you can either:
   - Use Vercel CLI to link your project and pull environment variables
   - Or use the Vercel Dashboard to get your `BLOB_READ_WRITE_TOKEN`

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### Required Environment Variables

Set these in your Vercel project settings:

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `BLOB_READ_WRITE_TOKEN` | Auto-configured when you add Vercel Blob |

### Setting Up Vercel Blob

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** and select **Blob**
4. Follow the setup wizard
5. The `BLOB_READ_WRITE_TOKEN` will be automatically added to your environment

### Deploy

```bash
# Using Vercel CLI
vercel

# Or connect your GitHub repo to Vercel for automatic deployments
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/         # Human mode chat endpoint
│   │   ├── profiles/     # Agent B profiles CRUD
│   │   ├── prompts/      # Agent prompts CRUD
│   │   ├── runs/         # Run management
│   │   └── sim/step/     # Simulation step endpoint
│   ├── history/          # Run history page
│   ├── prompts/          # Prompt editor page
│   ├── runs/[id]/        # Run detail/chat page
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home/setup page
├── lib/
│   ├── agents.ts         # OpenAI agent calls
│   ├── defaultPrompts.ts # Default prompt content
│   ├── openai.ts         # OpenAI client
│   └── storage.ts        # Vercel Blob utilities
└── types/
    └── index.ts          # TypeScript interfaces
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/runs` | GET | List all runs |
| `/api/runs?id=xxx` | GET | Get a specific run |
| `/api/runs` | POST | Create a new run |
| `/api/runs?id=xxx` | DELETE | Delete a run |
| `/api/chat?runId=xxx` | GET | Start chat (get first Agent A message) |
| `/api/chat` | POST | Send user message in human mode |
| `/api/sim/step` | POST | Execute one simulation step |
| `/api/prompts?agentType=xxx` | GET | Get prompts for an agent |
| `/api/prompts` | POST | Save a new prompt version |
| `/api/prompts` | PATCH | Set active prompt |
| `/api/profiles` | GET | List all profiles |
| `/api/profiles` | POST | Create a new profile |
| `/api/profiles?id=xxx` | DELETE | Delete a profile |

## Configuration

### Max Turns

The maximum number of conversation turns is set to 30 by default. This can be modified in `src/types/index.ts`:

```typescript
export const MAX_TURNS = 30
```

### OpenAI Model

The default model is `gpt-4o`. To change it, edit `src/lib/agents.ts`:

```typescript
const MODEL = 'gpt-4o'
```

## License

MIT
