# UI/UX Design Document — Lenny Growth Assistant

## 1. Design Philosophy & Aesthetic Identity

The design of Lenny Growth Assistant prioritizes **clarity, speed, and strict source provenance**. It uses a **monochrome minimalist** aesthetic with dark neutral surfaces (`#0a0a0a` / `#171717`) and high-contrast `#F5F5F5` accents. 

Primary principles:
- **Zero Distraction**: Eliminates decorative fluff, gradients, and low-utility badges in favor of typography, whitespace, and clear typographic hierarchy.
- **Immediate Grounding & Verifiability**: Sources and quotes are not buried in tooltips; they are brought forward via interactive **Verified Episode Quote Cards** with deep links to YouTube.
- **Continuous Momentum**: Dynamic Follow-up chips and Curated Growth Radar pills anticipate next steps so operators can dive deep without manual typing.

---

## 2. Desktop Workspace Layout

The application employs a 3-column workstation layout:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  [+] Lenny Growth Assistant        [Provider Dropdown: Groq ● Online]  [● System Live] │
├───────────────────┬────────────────────────────────────────────┬───────────────────────┤
│                   │                                            │                       │
│  Session History  │  Chat Center                               │  Artifact Studio      │
│                   │                                            │                       │
│  [+ New Session]  │  • Growth Radar Quick Shortcuts            │  • Preview / Code tab │
│                   │  • User Query                              │  • Word Count Metric  │
│  • B2B Funnels    │  • Grounded Answer                         │  • Copy Markdown      │
│  • PLG Loops      │  • Verified Episode Quote Card (YouTube ↗) │  • Download .md       │
│  • Retention      │  • Dynamic Follow-up Chips                 │  • Sandboxed Iframe   │
│                   │                                            │                       │
│                   │  [ Message Prompt Input + Send Button ]    │                       │
└───────────────────┴────────────────────────────────────────────┴───────────────────────┘
```

### Column Specifications
1. **Left Sidebar (`w-64`)**:
   - `+ New Session` button at top.
   - Chronological list of chat sessions with title truncation and active session indicator.
2. **Center Conversation Stream (`flex-1`)**:
   - Header bar displaying indexed chunk count (`7,500+ chunks indexed`), active provider dropdown selector, and real-time connectivity status dot.
   - Growth Radar chips at top of empty states.
   - Conversational message thread rendering Markdown, citations, quote cards, and dynamic follow-up chips.
   - Fixed input prompt bar with provider toggle sensitivity.
3. **Right Artifact Viewer (`w-[440px]`)**:
   - Slides open automatically when an essay or artifact is generated.
   - Header with Preview/Code tabs, word-count scorecard, copy button, and download trigger.
   - Sandboxed iframe preview isolating untrusted HTML rendering.

---

## 3. Key Interaction Elements & State Design

### A. Provider Selector Dropdown
- Located in the conversation header.
- Fetches real-time status from `/config`.
- Options clearly delineate operational status:
  - `Groq Cloud (gpt-oss-120b) — ● Online`
  - `Local Ollama (qwen2.5:7b) — ● Online`
  - `Anthropic Claude (claude-3-5-sonnet) — ○ Offline: offline (no API key)`
- Offline providers are disabled from user selection.
- Displays glowing status dot (`bg-emerald-400` vs `bg-red-400`) corresponding to the active model.

### B. Verified Episode Quote Card
- Rendered beneath grounded assistant messages.
- Features:
  - Guest name tag in high-contrast badge.
  - Verbatim excerpt from the transcript chunk.
  - Playable YouTube timestamp link (e.g. `https://youtube.com/watch?v=...&t=390s`) with clickable external icon.
  - Expandable/collapsible drawer for clean reading.

### C. Dynamic Follow-Up Chips
- 3 contextual questions synthesized specifically around the primary guest and topic.
- Clicking any chip immediately triggers the corresponding query without manual typing.

### D. Growth Radar Shortcuts
- Pre-configured search queries targeting the highest-signal framework episodes:
  - `Austin Hay on MarTech & Modern Growth Stacks`
  - `Elena Verna on B2B Product-Led Growth & Loops`
  - `Brian Balfour on Retention & Acquisition Loops`

---

## 4. Security & Isolation Architecture

| Threat Vector | Mitigation Strategy |
|---|---|
| **XSS via Artifact Code** | Rendered inside `<iframe sandbox="allow-scripts">` omitting `allow-same-origin`. Restricts DOM traversal, cookie access, and session exfiltration. |
| **Malicious Inline Scripts** | Content Security Policy (CSP) injected in iframe `srcdoc`: `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';` |
| **Unsafe Markdown Injection** | Client-side `DOMPurify.sanitize()` executed on all rendered markdown blocks. |
| **Server-Side Payload Poisoning** | Python backend applies `nh3` HTML stripping prior to saving or returning artifacts. |

---

## 5. Responsive Behavior & Accessibility

- **Breakpoints**:
  - `Desktop (>= 1024px)`: Full 3-column workstation.
  - `Tablet / Laptop (768px - 1023px)`: Artifact viewer collapased into sliding overlay panel.
  - `Mobile (< 768px)`: Session list collapses into slide-over drawer; single-column streamlined chat interface.
- **Accessibility (WCAG AA)**:
  - Form controls have distinct `<label>` tags with `sr-only` descriptions for screen readers.
  - Minimum contrast ratio > 4.5:1 across all `#F5F5F5` and neutral-400 text elements against `#0a0a0a` background.
  - Full keyboard accessibility across buttons, chips, and dropdown selections.
