# Manual Test Plan & Evaluator Runbook

This document details the end-to-end manual verification procedure for evaluators and engineers testing the **Lenny Growth Assistant** system.

---

## 1. Prerequisites Verification
1. Docker Desktop installed and running.
2. Ollama running locally (`ollama run qwen2.5:7b` and `nomic-embed-text` installed).
3. `.env` file copied from `.env.example` with valid configurations (`LLM_PROVIDER`, `GROQ_API_KEY` optional if running Ollama).
4. All containers running: `docker compose ps` shows `db`, `api`, `agent`, `web` in healthy status.

---

## 2. Test Cases

### Test 1: Cold Start & UI Interface Integrity
- **Steps:** Navigate to `http://localhost:5173`.
- **Expected Result:**
  - Modern monochrome interface with `#F5F5F5` accents loads immediately.
  - Left panel displays "Lenny Assistant", "New Chat" button, and session history.
  - Active provider badge in header displays current provider (e.g. `groq · gpt-oss-120b` or `ollama · qwen2.5:7b`).
  - Radar topic pills are visible above the chat input box.

### Test 2: Grounded Transcript Q&A with Verified YouTube Episode Link
- **Steps:** Click the radar pill `🚀 Elena Verna on Product-Led Sales` or ask: `"What did Elena Verna say about product led sales?"`.
- **Expected Result:**
  - Fast response streaming via SSE.
  - Response contains grounded takeaways citing episode and timestamped points.
  - Guest badge appears above the message: `Lenny's Podcast — ELENA VERNA`.
  - Verified Episode Quote Card renders with verbatim dialogue excerpt.
  - Episode button `▶ Watch on YouTube ↗` links directly to Elena Verna's video on YouTube with timestamp (`&t=...s`).
  - Dynamic follow-up chips appear beneath the message (e.g., `What specific frameworks did Elena Verna recommend?`).

### Test 3: Structured Ship 30 Essay Generation & Artifact Viewer
- **Steps:** Click `✍️ Ship 30 Essay: Netflix Culture` or input: `"Write a Ship 30 essay on Netflix culture and excellence."`.
- **Expected Result:**
  - Agent classifies intent as `essay`.
  - Artifact Viewer panel opens automatically beside the chat.
  - Header displays live Word Count (~1,250 words) and Estimated Reading Time.
  - Preview tab renders sanitized HTML with typography inside a sandboxed iframe.
  - Code tab displays raw markdown.
  - "Copy" and "Download" buttons successfully export the generated essay.

### Test 4: Dynamic Follow-Up Interaction
- **Steps:** Click any of the 3 dynamic contextual follow-up question chips rendered under an assistant answer.
- **Expected Result:**
  - Query is submitted automatically.
  - The conversation continues within the same session context.
  - Response is grounded using rolling session history.

### Test 5: Out-of-Scope Refusal Behavior
- **Steps:** Enter an unrelated query: `"What is the capital of France and what is the recipe for chocolate cake?"`.
- **Expected Result:**
  - Assistant responds with grounded refusal: `"The transcripts don't support an answer."`
  - System does not hallucinate facts outside Lenny's Podcast transcripts.

### Test 6: Provider Resilience & Fallback
- **Steps:** In `.env`, simulate Groq rate-limit or invalid key (`GROQ_API_KEY=invalid`), with `LLM_FALLBACK=ollama`. Submit a prompt.
- **Expected Result:**
  - Fastify FallbackManager logs provider failure and seamlessly hops to Ollama (`qwen2.5:7b`).
  - User receives synthesized answer without UI crash or 500 error.

### Test 7: Session Isolation & History Persistence
- **Steps:** Click `New Chat`. Submit `"What is product-market fit?"`. Switch back to the previous session in the sidebar.
- **Expected Result:**
  - New session has independent messages.
  - Switching back restores earlier conversation history from PostgreSQL.
