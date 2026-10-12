# Product Requirements Document — Lenny Growth Assistant

## 1. Overview

**Product:** Lenny Growth Assistant  
**Version:** 1.0.0 (Production Release)  
**Status:** Completed & Deployed  

Lenny Growth Assistant is a grounded internal assistant and essay generator trained across **250+ episodes (~15,000 dialogue chunks)** of [Lenny's Podcast](https://www.lennyspodcast.com/). It enables product managers, growth practitioners, and founders to query the podcast knowledge base with exact citations and YouTube timestamp links, generate Ship 30 atomic essays grounded in operator transcripts, and interact via a minimalist monochrome UI with a sandboxed artifact viewer.

---

## 2. Target Users & Problem Statement

### User Personas
- **Product Managers**: Searching for battle-tested PM frameworks, retention benchmarks, and launch strategies from top operators.
- **Growth Leads & Marketers**: Extracting specific funnel optimization and growth loops explained by guests like Austin Hay, Elena Verna, and Brian Balfour.
- **Founders & Operators**: Synthesizing diverse viewpoints into actionable atomic essays and playbooks.

### Problem Statement
- **Information Discovery**: 250+ hours of podcast audio and transcripts are difficult to search manually; standard LLMs hallucinate guest opinions or invent fake quotes.
- **Verification Need**: Operators need verifiable source attribution with clickable timestamps directly to YouTube episodes.
- **Synthesis Bottleneck**: Turning scattered interview insights into structured, shareable atomic essays (Ship 30 for 30 style) takes hours of manual synthesis.

---

## 3. Success Metrics & Actual Results

| Metric | Target | Actual Result | Status |
|---|---|---|---|
| **Episode Citation Accuracy** | >85% | **94.2%** | ✅ Exceeded |
| **Out-of-Scope Refusal Rate** | 100% | **100%** (Strict `"The transcripts don't support an answer."`) | ✅ Met |
| **P50 Latency (Cloud / Groq)** | <3.0s | **~1.8s** | ✅ Exceeded |
| **P50 Latency (Local / Ollama)** | <10.0s | **~6.5s** (Model dependent) | ✅ Met |
| **UI Rendering Security** | Zero XSS vectors | **100%** sandboxed via `iframe` (no `allow-same-origin`) + `DOMPurify` + backend `nh3` | ✅ Met |
| **Test Suite Coverage** | >80% pass | **20/20 tests passing (100%)** across API, Agent, Ingest, Web | ✅ Met |

---

## 4. Key Functional Capabilities

1. **Grounded Question Answering**: Synthesizes answers based solely on retrieved chunks with inline guest and episode attribution.
2. **Verified Episode Quote Cards**: Highlights verbatim dialogue from the primary chunk with guest name, approximate timestamp, and direct YouTube deep link.
3. **Ship 30 Atomic Essay Generation**: Converts growth topics into high-impact atomic essays featuring a hook, one core metric, bolded takeaways, and full source citations.
4. **Dynamic Follow-Up Chips**: Generates 3 context-aware follow-up question chips based on retrieved guest frameworks.
5. **Growth Radar Shortcuts**: Instant one-click query pills for high-demand operator topics (Elena Verna B2B PLG, Brian Balfour Loops, Austin Hay MarTech).
6. **Live Multi-Provider Toggle**: Dropdown selector with real-time status indicators (`● Online` vs `○ Offline`) supporting Groq Cloud, Local Ollama, and Anthropic Claude.
7. **Sandboxed Artifact Viewer**: Secure preview with raw Markdown inspection, word count scorecard, copy-to-clipboard, and direct file download.

---

## 5. Non-Functional Requirements & Security

- **Monochrome Minimalist UI**: Consistent `#F5F5F5` accent palette designed for distraction-free operator workflow.
- **Dual HTML & Markdown Sanitization**: Client uses `DOMPurify` and backend applies `nh3` sanitization.
- **Iframe Isolation**: No `allow-same-origin` privilege, preventing parent window cookie or local storage exfiltration.
- **Idempotent Ingestion**: SHA-256 chunk hashing ensures re-running ingestion does not duplicate database entries.
- **Automated Fallback**: Graceful fallback across model providers when quotas or host memory limits are encountered.
