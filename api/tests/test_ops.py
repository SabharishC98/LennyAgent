from __future__ import annotations
import pytest
from fastapi.testclient import TestClient
from src.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_deep_health_returns_components(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "db" in data
    assert "agent" in data
    assert "ollama" in data
    assert "keys" in data
    assert isinstance(data["keys"]["groq"], bool)
