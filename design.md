# UI/UX Design Document — Lenny Growth Assistant

> [!NOTE]
> Phase 1 scaffold. Full UI implementation in Phase 5. This document captures design decisions to guide implementation.

## 1. Layout

Three-panel layout (desktop default):

```
┌─────────────────────────────────────────────────────────────────┐
│  [☰] Lenny Growth Assistant                          [Settings]  │
├──────────────┬──────────────────────────────┬───────────────────┤
│              │                              │                   │
│  Session     │      Chat Center             │  Artifact Viewer  │
│  List        │                              │                   │
│              │  [Messages + SSE stream]     │  [Preview/Code]   │
│  [+ New]     │                              │                   │
│              │  [Provider badge] [Fallback] │  [Copy] [Download]│
│  Session 1   │                              │  [Version ▼]      │
│  Session 2   │  ──────────────────────────  │                   │
│  ...         │  [Input field] [Send]        │                   │
│              │                              │                   │
└──────────────┴──────────────────────────────┴───────────────────┘
```

### Panel Widths (desktop)
- Session list: `w-64` (256px), collapsible
- Chat center: `flex-1` (fills remaining space)
- Artifact viewer: `w-96` (384px), hideable

---

## 2. Session List (Left Panel)

| Element | Behavior |
|---|---|
| **New Chat button** | Top of panel; creates new session; navigates to empty chat |
| **Session list** | Scrollable; sorted by last-updated descending |
| **Session item** | Shows session title (first user message, truncated to 40 chars) + relative timestamp |
| **Active session** | Highlighted with `bg-gray-800` border-left accent |
| **Delete session** | On hover, show trash icon; confirm before delete |

---

## 3. Chat Center (Main Panel)

### Message Types
| Type | Appearance |
|---|---|
| User message | Right-aligned, `bg-blue-600`, white text |
| Assistant message | Left-aligned, `bg-gray-800`, gray-100 text, with citation badges |
| System message | Centered, `text-gray-500`, italic |
| Error message | Left-aligned, `bg-red-900/40`, red-400 text, with retry button |

### Streaming (SSE)
- Messages stream token-by-token via Server-Sent Events
- Blinking cursor shown during streaming
- Citations appear after streaming completes
- "Stop generating" button visible during stream

### Provider/Model Badge
- Displayed below assistant messages
- Format: `[groq / llama-3.3-70b-versatile]` or `[ollama / qwen2.5:7b]`
- Color: `bg-gray-700 text-gray-300 text-xs rounded px-2 py-0.5`

### Fallback Notice Banner
- Shown when provider fallback occurs
- Format: `"⚠ Fell back from groq → ollama (reason: rate limit)"`
- Color: `bg-amber-900/40 text-amber-300`
- Dismissible

### Input Area
- Multi-line textarea (auto-grows, max 8 rows)
- Send button (Enter to send, Shift+Enter for newline)
- Character/token counter (shown when approaching context limit)
- Disabled during streaming

---

## 4. Artifact Viewer (Right Panel)

### Tabs
| Tab | Content |
|---|---|
| **Preview** | Rendered Markdown/HTML in sandboxed iframe |
| **Code** | Raw source with syntax highlighting |

### Controls
| Control | Action |
|---|---|
| **Copy button** | Copies raw artifact source to clipboard |
| **Download button** | Downloads as `.md` or `.html` file |
| **Version dropdown** | Lists all versions of this artifact; navigate between them |

### Iframe Sandbox (Security)
```html
<iframe
  sandbox="allow-scripts"
  srcdoc="..."
  title="Artifact preview"
  aria-label="Artifact preview"
/>
```
- **No `allow-same-origin`** — isolates artifact from parent page
- CSP injected into `srcdoc` head: `default-src 'none'; style-src 'unsafe-inline'; script-src 'none'`
- DOMPurify sanitizes Markdown-rendered HTML before iframe injection

---

## 5. Citation Panel (Slide-In)

- Triggered by clicking a citation badge `[1]` in an assistant message
- Slides in from the right (over the artifact panel on mobile)
- Content:
  - Episode title, guest, date
  - Speaker turn (if available)
  - Chunk text (verbatim, highlighted)
  - Retrieval score (cosine similarity + BM25 rank shown in trace)
- Keyboard: `Esc` closes panel; `Tab` navigates to next/previous citation

---

## 6. Trace Drawer

- Toggle via "Show trace" link below each assistant message
- Content:
  | Field | Value |
  |---|---|
  | Router decision | `qa` / `essay` / `artifact` / `out-of-scope` |
  | Retrieved chunks | List of chunk IDs, scores, episode refs |
  | Latency | Total, retrieval, LLM |
  | Tokens | Prompt, completion, total |
  | Fallback hops | Provider chain attempted |
- Only shown when trace data is available (Phase 6+)
- Collapsible, `text-xs` monospace, `bg-gray-900`

---

## 7. States

| State | UI |
|---|---|
| **Loading skeleton** | Animated gray blocks for messages and panels |
| **Empty (no sessions)** | Centered illustration + "Ask Lenny a question" prompt |
| **Error with retry** | Error message with red border + "Retry" button |
| **Ollama-down banner** | Top-of-page sticky banner: `"⚠ Ollama is not reachable. Check host.docker.internal:11434"` |
| **No grounded answer** | Exact refusal text: `"I couldn't find relevant information in the transcripts to answer this question. Please try rephrasing or ask about a topic covered in Lenny's Podcast."` |
| **Streaming** | Blinking cursor; stop button; provider badge animates |

---

## 8. Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| **Desktop (≥1024px)** | Three-panel layout as described above |
| **Tablet (768px–1023px)** | Artifact viewer hidden by default; toggle button in toolbar |
| **Mobile (<768px)** | Session list collapses to hamburger menu; artifact viewer becomes bottom drawer |

### Mobile Bottom Drawer (Artifact Viewer)
- Triggered by "View artifact" button in chat
- Slides up from bottom, covers 75% of viewport
- Swipe down to dismiss
- Same tabs (Preview/Code) and controls as desktop

---

## 9. Accessibility

- All interactive elements have `aria-label` attributes
- Citation badges: `aria-label="Citation 1 — click to view source"`
- Keyboard navigation: full `Tab` order; `Enter`/`Space` for buttons
- Focus trap in slide-in panels and drawers
- Contrast ratio: minimum WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Reduced motion: respect `prefers-reduced-motion` for animations
- Screen reader announcements for streaming messages via `aria-live="polite"`

---

## 10. Design Decisions

| Decision | Rationale |
|---|---|
| **No `allow-same-origin` in artifact iframe** | Prevents artifact content from accessing parent page cookies, localStorage, or executing same-origin JS |
| **DOMPurify for Markdown rendering** | Strips unsafe tags (script, iframe, on* handlers) before injecting into DOM |
| **CSP in iframe `srcdoc`** | Double defense — even if DOMPurify misses something, CSP blocks execution |
| **SSE over WebSocket** | Simpler server-side implementation; no bidirectional need for streaming responses |
| **Version dropdown, not history page** | Keeps artifact versions accessible without navigation; reduces cognitive load |
| **Exact refusal text** | Prevents vague responses; sets clear user expectation about grounding |

---

## 11. Information Architecture

```
Session
  └─ Messages (ordered)
       ├─ User message
       └─ Assistant message
            ├─ Citations → Citation Panel
            ├─ Artifact link → Artifact Viewer
            │    └─ Versions (1..n)
            └─ Trace data → Trace Drawer
```
