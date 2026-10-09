"""Phase 1 scaffold health endpoint tests."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_health_returns_ok(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "lenny-api"


def test_request_id_propagated(client: TestClient):
    """x-request-id header should be echoed in the response."""
    resp = client.get("/health", headers={"x-request-id": "test-id-123"})
    assert resp.headers.get("x-request-id") == "test-id-123"


def test_request_id_generated(client: TestClient):
    """If no x-request-id provided, one should be generated."""
    resp = client.get("/health")
    assert "x-request-id" in resp.headers
    assert len(resp.headers["x-request-id"]) > 0


def test_config_returns_provider(client: TestClient):
    resp = client.get("/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "provider" in data
    # Must not return any API keys
    resp_text = resp.text
    assert "groq_api_key" not in resp_text
    assert "anthropic_api_key" not in resp_text
