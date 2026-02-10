# CLAUDE.md - Voice Agent Project Documentation

## Project Overview

**Voice Agent** is a Next.js-based interview orchestration platform that coordinates three AI agents to conduct, simulate, and evaluate interviews. The system is designed for the Vercel free tier and uses OpenAI's GPT models.

### Core Purpose
Evaluate interview quality by having one AI agent (Agent A) conduct interviews, optionally with another AI (Agent B) simulating a persona, and a third AI (Agent C) evaluating the interview's effectiveness.

### Three Operating Modes
1. **Human Mode**: User chats directly with Agent A (interviewer)
2. **Simulation Mode**: Agent A and Agent B converse automatically
3. **Transcript Mode**: Upload existing conversations for evaluation

---

## Architecture

### The Three-Agent System

#### Agent A - Interviewer (src/lib/agents.ts:43-109)
- **Role**: Conducts interviews using strategic follow-up questions
- **Model**: Configurable (default: gpt-5.1)
- **Strategy**: "Actionable specificity" - seeks verifiable, filterable, behavioral answers
- **Output Format**: `flag:message` where flag is 0 (continue) or 1 (done)
- **Prompt**: Focuses on angle-shift protocol, insight types, and synthesis

#### Agent B - Simulated Persona (src/lib/agents.ts:113-143)
- **Role**: Responds as a configurable persona in simulation mode
- **Model**: Configurable (default: gpt-4o-mini)
- **Configuration**: JSON/YAML profiles stored in `.data/profiles/`
- **Default Profile**: "Dominic Penaloza" - 34-year-old architect with detailed preferences

#### Agent C - Evaluator (src/lib/agents.ts:235-328)
- **Role**: Evaluates interview quality with configurable scoring
- **Model**: Configurable (default: gpt-5.1)
- **Technology**: OpenAI Structured Outputs (JSON schema enforcement)
- **Output**: Overall score, subscores, strengths, weaknesses, suggestions, evidence

### Evaluation System

**Two-Level Configuration** (src/types/index.ts:21-181):

1. **Scoring Factors** - Configurable evaluation criteria
   - Default factors: relevance, coverage, clarity, efficiency, redundancy, reasoning, tone
   - Each has: name, label, type, range [0,100], description

2. **Output Options** - Toggleable evaluation sections
   - overallScore (number)
   - strengths (array of strings)
   - weaknesses (array of strings)
   - actionableSuggestions (array of strings)
   - stopTiming (enum: 'too early' | 'appropriate' | 'too late')
   - evidence (array of objects with quote/note/category)

**Key Innovation**: Scoring factors are decoupled from Agent C's prompt, making evaluation criteria fully configurable without prompt editing.

---

## Project Structure

### Key Files

**Core Logic**
- `src/lib/agents.ts` (400+ lines) - All agent OpenAI calls and schema generation
- `src/lib/storage.ts` (920 lines) - Multi-backend storage abstraction
- `src/types/index.ts` (300+ lines) - TypeScript interfaces for all data structures
- `src/lib/defaultPrompts.ts` - Default prompts and profiles

**API Endpoints** (`src/app/api/`)
- `runs/route.ts` - Run CRUD operations
- `chat/route.ts` - Human mode chat handling
- `sim/step/route.ts` - Simulation step execution
- `prompts/route.ts` - Prompt management with versioning
- `profiles/route.ts` - Profile management
- `settings/route.ts` - Settings persistence

**Frontend Pages** (`src/app/`)
- `page.tsx` (1075 lines) - Home/setup page (mode selection, question input, profile picker)
- `settings/page.tsx` (1200+ lines) - Unified settings UI (evaluation config, prompts, models)
- `runs/[id]/page.tsx` - Run detail and chat interface
- `history/page.tsx` - Run history with search

**Configuration Files**
- `.data/settings.json` - Current model selections and evaluation config
- `.data/prompts/{agentType}/{promptId}.json` - Versioned prompts
- `.data/profiles/{profileId}.json` - Agent B personas
- `.data/runs/{runId}.json` - Run transcripts and evaluations

---

## Data Storage

### Three-Tier Storage Priority
1. **Redis (Upstash)** - If `KV_REST_API_URL` or `UPSTASH_REDIS_REST_URL` set
2. **Vercel Blob** - If `BLOB_READ_WRITE_TOKEN` set
3. **Local Files** - Development fallback (`.data/` directory)

All storage operations go through `src/lib/storage.ts` which abstracts the backend.

### Data Structures

**Run** - Core data structure for each interview session
- Contains: transcript, evaluation, prompt snapshots, profile snapshot, metadata
- Immutable snapshots ensure reproducibility
- Status: 'pending' | 'in_progress' | 'completed' | 'error'

**Prompt** - Versioned prompts for each agent
- Only one active per agent type
- Version naming: "v1.30" with author attribution
- Can't delete active prompts

**Profile** - Agent B personas
- JSON/YAML format
- Default profile always available
- Used in simulation mode

**Settings** - System configuration
- Model selections for each agent
- Scoring factors configuration
- Output options configuration

---

## Important Patterns & Conventions

### 1. Prompt Snapshots
When a run is created, current active prompts and profiles are copied into the run record. This ensures reproducibility even if prompts change later.

### 2. Model Compatibility
Different models use different token parameters:
- GPT-5/O1/O3: Use `max_completion_tokens`
- Others: Use `max_tokens`
- Handled by `getTokenParams()` (agents.ts:21-27)

### 3. Schema Generation
`generateEvaluationSchema()` (agents.ts:147-233) dynamically builds JSON schema from settings:
- Subscores mapped from scoring factors (always required)
- Output options conditionally included (based on enabled flag)
- Uses OpenAI's `strict: true` mode for enforcement

### 4. Error Handling
- Detailed logging for agent calls
- JSON parse failures logged with full response
- Graceful fallbacks for missing data

### 5. Version Control
- Prompts are versioned with name and author
- Runs store prompt version info
- Can view which prompt version was used in history

---

## Common Tasks & Where to Find Things

### Modifying Agent Behavior
- **Agent A strategy**: Edit prompt in Settings → Prompts tab or `AgentA_prompt.txt`
- **Agent B personas**: Settings → Profiles (create/edit profiles)
- **Agent C evaluation**: Settings → Evaluation tab (modify scoring factors/output options)

### Changing Evaluation Criteria
- **Add/remove factors**: `src/app/settings/page.tsx` - Evaluation tab
- **Modify schema**: Changes auto-reflected in `generateEvaluationSchema()`
- **Agent C interpretation**: Edit Agent C prompt to explain how to use factors

### Adjusting Models
- **Per-agent selection**: Settings → Models tab
- **Available models**: Defined in `src/types/index.ts` (LLMModel type)
- **Default models**: gpt-5.1 (A, C), gpt-4o-mini (B)

### Working with Storage
- **Switch backends**: Set environment variables (see README.md)
- **Add new data types**: Follow pattern in `storage.ts` (local/blob/redis functions)
- **Migration**: Add migration logic to `ensureSettings()` pattern

### Debugging
- **Agent responses**: Check console logs for full API responses
- **Evaluation schema**: `generateEvaluationSchema()` logs schema to console
- **Storage errors**: Detailed error messages with operation context

---

## Recent Evolution (Last 5 Commits)

1. **b70a967** - Fully configurable evaluation system with unified Settings UI
2. **62b37e5** - Scoring factors decoupled from Agent C prompt
3. **3d4ba2f** - OpenAI Structured Outputs enforce evaluation schema
4. **599b0de** - Detailed JSON structure logging for debugging
5. **c4251ec** - Fix JSON mode requirement with 'json' keyword

**Key Theme**: Moving from hardcoded evaluation → fully configurable system with schema enforcement.

---

## Tech Stack

**Frontend**: Next.js 14 (App Router), React 18, TypeScript 5.7, Tailwind CSS 3.4
**Backend**: Next.js API Routes
**AI**: OpenAI SDK 4.77 (GPT-4o, GPT-5.1)
**Storage**: Upstash Redis, Vercel Blob, or Local Files
**Deployment**: Vercel (free tier compatible)

---

## Development Tips

### Running Locally
```bash
npm install
cp .env.example .env.local
# Add OPENAI_API_KEY to .env.local
npm run dev
```

### Clearing Cache
```bash
npm run dev:clean  # Removes .next directory
npm run clean      # Removes .next and node_modules cache
```

### Environment Variables
- `OPENAI_API_KEY` - Required for all agent calls
- `BLOB_READ_WRITE_TOKEN` - For Vercel Blob (optional)
- `KV_REST_API_URL` - For Upstash Redis (optional)
- `UPSTASH_REDIS_REST_URL` - Alternative Redis URL (optional)

### Testing Changes
1. **Agent behavior**: Create test run in UI, observe transcript
2. **Evaluation**: Use transcript mode with known conversation
3. **Storage**: Check `.data/` directory for local files
4. **API**: Use browser DevTools Network tab or curl

---

## Troubleshooting

**Agent C returns incomplete evaluation**
- Check `generateEvaluationSchema()` output in console
- Verify all scoring factors have valid ranges
- Ensure output options are properly enabled
- Increase `max_tokens`/`max_completion_tokens` if needed

**Simulation doesn't progress**
- Check Agent A end flag logic (must output `1:message` to end)
- Verify Agent B profile is selected
- Check console for API errors

**Storage errors**
- Verify environment variables are set
- Check `.data/` directory permissions
- Redis: Ensure KV URLs are correct
- Blob: Verify token has read/write access

**JSON parse failures**
- Enable `response_format: {type: "json_schema", ...}` in agent calls
- Check for `"json"` keyword in user messages (workaround)
- Review Agent C prompt for JSON output instructions

---

## Performance Considerations

- **Max turns**: Default 30 (configurable in `src/types/index.ts:MAX_TURNS`)
- **Token limits**: Agent C uses 4000 max tokens (increased from 2000 for complex evaluations)
- **Caching**: Settings cached for 5 seconds to reduce storage calls
- **Model costs**: Use gpt-4o-mini for Agent B to reduce costs in simulation

---

## Future Enhancement Areas

Based on commit history and architecture:
- Real-time streaming for Agent C evaluations
- Batch evaluation of multiple runs
- Export/import functionality for prompts and profiles
- A/B testing framework for different prompts
- More granular evidence categorization
- Custom scoring factor types beyond 0-100 range
- Multi-language support

---

## Getting Help

- Issues: https://github.com/anthropics/claude-code/issues
- Documentation: See README.md for user-facing docs
- Code: This file (CLAUDE.md) for technical context
