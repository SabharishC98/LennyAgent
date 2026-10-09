from src.artifacts import sanitize_artifact

def test_backend_sanitizer_removes_scripts():
    payload = "Hello <script>alert(1)</script> World"
    assert "<script>" not in sanitize_artifact(payload)

def test_backend_sanitizer_removes_event_handlers():
    payload = "<img src='x' onerror='alert(1)'>"
    cleaned = sanitize_artifact(payload)
    assert "onerror" not in cleaned
