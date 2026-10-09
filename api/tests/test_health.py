from __future__ import annotations
import pytest
from fastapi.testclient import TestClient
from src.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_config_returns_provider(client: TestClient):
    resp = client.get("/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "provider" in data
    assert "fallback" in data
    assert "phase" in data
    resp_text = resp.text
    assert "groq_api_key" not in resp_text

# In phase 3 we are proxying SSE. We can write a simple test for POST /sessions/{id}/messages
# Testing SSE directly via TestClient can be a bit tricky, but checking the status code is fine for scaffold.
def test_post_message_returns_stream(client: TestClient):
    resp = client.post("/sessions/123/messages", )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]

