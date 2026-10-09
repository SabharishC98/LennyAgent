# Product Requirements Document — Lenny Growth Assistant

> [!NOTE]
> This document reflects decisions accurate for the Phase 1 scaffold. Later phases add functionality and will update relevant sections.

## 1. Overview

**Product:** Lenny Growth Assistant
**Version:** 0.1.0 (Phase 1 Scaffold)
**Last Updated:** 2026-10-09

Lenny Growth Assistant is a grounded internal assistant over Lenny Rachitsky's Podcast transcripts. It enables product managers, growth practitioners, and founders to query the podcast knowledge base with precise citations, generate Ship 30 essays grounded in transcript content, and produce Markdown/HTML artifacts with a sandboxed viewer.

---

## 2. Users

| Persona | Need |
|---|---|
| **Product Managers** | Find specific strategies, frameworks, and benchmarks from past episodes |
| **Growth Practitioners** | Extract growth tactics and case studies from specific guests/topics |
| **Founders** | Synthesize advice across multiple episodes into actionable insights |

---

## 3. Problem Statement

Lenny's Podcast contains hundreds of episodes with high-signal knowledge on product growth, hiring, and strategy. The problems with the current state:

- **Hard to search**: Podcast knowledge is not easily searchable — manual notes miss cross-episode connections
- **No citations**: Asking an LLM without grounding produces confident but unverifiable answers
- **No synthesis**: Users cannot easily request a formatted essay that synthesizes multi-episode insights
- **No artifacts**: There is no way to generate and version Markdown/HTML artifacts from the knowledge base

---

## 4. Success Metrics

| Metric | Target | Phase |
|---|---|---|
| Correct-episode citation rate | >85% | Phase 7 eval |
| Out-of-scope refusal rate | 100% (when score < threshold) | Phase 3 |
| P50 latency (cloud — Groq) | <3 seconds | Phase 6 |
| P50 latency (local — Ollama) | <10 seconds | Phase 6 |
| UI renders without XSS | 100% (DOMPurify + sandbox) | Phase 5 |

---

## 5. Assumptions

- Transcripts are available locally or via a git repository (URL set via `TRANSCRIPT_REPO_URL`)
- Ollama runs on the host machine at `http://host.docker.internal:11434`
- `nomic-embed-text` model is available in Ollama for embeddings
- `qwen2.5:7b` model is available in Ollama for local inference
- Groq free tier is the default cloud provider (subject to rate limits)
- PostgreSQL + pgvector is sufficient for the retrieval workload (no separate vector DB needed)

---

## 6. Scope

### 6.1 In Scope

| Feature | Description | Phase |
|---|---|---|
| **Transcript Q&A with citations** | User asks a question; system retrieves relevant chunks; LLM answers with citations | Phase 3 |
| **Ship 30 essay generation** | User requests an essay; system retrieves transcripts; LLM generates Ship 30 format | Phase 4 |
| **Markdown/HTML artifact generation** | Generate versioned artifacts; sanitize; display in sandboxed iframe viewer | Phase 5 |
| **Provider toggle** | Switch between Ollama, Groq, Anthropic via `LLM_PROVIDER` env var | Phase 3 |
| **Fallback chain** | If primary provider fails, fall back to `LLM_FALLBACK` | Phase 3 |
| **Trace drawer** | Show routing decisions, chunk scores, latency, tokens | Phase 6 |
| **Citation panel** | Click a citation to see the chunk text + episode metadata | Phase 5 |

### 6.2 Out of Scope

- Real-time transcript fetching (transcripts must be pre-ingested)
- Multi-user authentication and authorization
- Transcript editing or annotation
- Fine-tuning any LLM
- Mobile native apps

---

## 7. Core Flows

### Flow 1 — Q&A with Citations
```
User asks question
  → API validates & rewrites query
  → Hybrid retrieval (BM25 + pgvector, RRF fusion)
  → Top-k chunks selected
  → LLM generates answer with inline citations [1][2]
  → Response streamed to UI via SSE
  → Citation panel available on click
```

### Flow 2 — Ship 30 Essay Generation
```
User requests essay on topic
  → API rewrites topic as retrieval query
  → Hybrid retrieval → top-k chunks
  → LLM generates essay in Ship 30 format (hook, body, CTA)
  → Essay returned as artifact + inline in chat
  → Artifact versioned in DB
```

### Flow 3 — Artifact Generation + Viewer
```
User requests Markdown or HTML artifact
  → LLM generates artifact content
  → Backend sanitizer strips unsafe HTML
  → Artifact saved with version number
  → Frontend renders in sandboxed iframe (no allow-same-origin)
  → User can copy, download, or view version history
```

---

## 8. Acceptance Criteria

### Phase 1 (Current)
- [ ] All service health endpoints return `{"status": "ok"}`
- [ ] `docker compose config` validates without errors
- [ ] `npm install` completes without errors
- [ ] API pytest suite passes (health + request-id tests)
- [ ] Agent Vitest suite passes (scaffold test)
- [ ] Ingest Vitest suite passes (scaffold test)
- [ ] Web Vitest suite passes (App render test)
- [ ] `.env` is not committed; `.env.example` is tracked
- [ ] Git history contains Phase 1 scaffold commit

### Phase 7 (Evaluation)
- [ ] Evaluation harness runs against golden QA set
- [ ] Citation accuracy >85%
- [ ] Out-of-scope refusal rate 100%
- [ ] P50 latency meets targets above

---

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Hallucination** | High | High | Grounding with retrieved chunks; refusal when retrieval score < threshold |
| **Local latency (Ollama)** | Medium | Medium | Optimize chunk count (top-5); use streaming; set user expectation (<10s) |
| **Groq rate limits** | Medium | Medium | Fallback chain to Ollama; cache common queries (Phase 6) |
| **Data leakage** | Low | High | Sandbox iframe (no `allow-same-origin`); DOMPurify; backend HTML sanitizer |
| **XSS via artifact rendering** | Low | High | Iframe `sandbox` attribute + strict CSP in `srcdoc`; DOMPurify for markdown |
| **API key exposure** | Low | Critical | `.env` in `.gitignore`; CI check validates `.env.example` has empty secrets |

---

## 10. Implementation Plan (7 Phases)

| Phase | Goal | Key Deliverables |
|---|---|---|
| **1** | Docs + Scaffold | PRD, design, architecture, README; all service skeletons; CI |
| **2** | Ingestion Pipeline | Clone → parse → chunk → embed → upsert (idempotent) |
| **3** | Retrieval + Q&A | Hybrid BM25+pgvector; RRF; LLM answer + citations; provider toggle |
| **4** | Essay Skill | Ship 30 format; essay routing; grounded generation |
| **5** | Frontend UI | Three-panel layout; SSE chat; artifact viewer; citation panel; DOMPurify |
| **6** | Hardening | Deep health checks; latency optimization; trace drawer; eval harness |
| **7** | Evaluation | Golden QA set; citation accuracy; refusal rate; latency benchmarks |
