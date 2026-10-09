# Manual Test Plan

## End-to-End UI Smoke Tests
1. **Load Application:** Navigate to http://localhost:5173. Ensure New Chat and Session List are visible.
2. **Configuration Status:** Observe the badge in the chat window matches the active LLM Provider.
3. **Ask a Question:** Ask "What is product market fit?". Ensure the response streams back.
4. **Citation Check:** Click a citation number in the response. Ensure the source panel slides out with chunk metadata.
5. **Essay Generation:** Type "Write an essay about growth loops." Ensure a ~1,250 word essay is produced.
6. **Artifact Viewing:** Observe the artifact pane updating with HTML/Markdown content. Ensure the Preview and Code tabs toggle correctly.
7. **Trace Drawer:** Open the trace drawer and verify router decision, retrieval scores, and fallback paths are displayed.
