from __future__ import annotations
import re
import uuid
import json
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

# Simple backend sanitizer for defense in depth
def sanitize_artifact(content: str) -> str:
    # Strip script tags
    content = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', content, flags=re.IGNORECASE)
    # Strip on* event handlers
    content = re.sub(r'(?i)\bon[a-z]+\s*=\s*(?:["\'][^"\']*["\']|[^\s>]+)', '', content)
    return content

app = FastAPI()

# Temporary dict to store mock artifacts
ARTIFACTS_STORE = {}

@app.post("/artifacts")
async def create_artifact(request: Request):
    data = await request.json()
    content = sanitize_artifact(data.get("content", ""))
    parent_id = data.get("parent_id")
    
    version = 1
    if parent_id and parent_id in ARTIFACTS_STORE:
        version = ARTIFACTS_STORE[parent_id]["version"] + 1
        
    art_id = str(uuid.uuid4())
    ARTIFACTS_STORE[art_id] = {"id": art_id, "content": content, "version": version}
    
    return {"id": art_id, "version": version, "content": content}

@app.get("/artifacts/{artifact_id}")
async def get_artifact(artifact_id: str):
    if artifact_id in ARTIFACTS_STORE:
        return ARTIFACTS_STORE[artifact_id]
    return JSONResponse(status_code=404, content={"message": "Not found"})
