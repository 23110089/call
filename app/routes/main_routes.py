"""
Main HTTP Routes
Serve HTML pages and configuration endpoints
"""
import os
from fastapi import APIRouter
from fastapi.responses import HTMLResponse, JSONResponse

from app.config import settings

router = APIRouter()


@router.get("/", response_class=HTMLResponse)
async def index():
    """Serve main video call page"""
    html_path = os.path.join("static", "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())


@router.get("/test", response_class=HTMLResponse)
async def test_ice():
    """Serve ICE connectivity test page"""
    html_path = os.path.join("static", "test-ice.html")
    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())


@router.get("/config")
async def get_config():
    """
    Return ICE servers configuration for WebRTC
    This includes STUN and self-hosted TURN servers
    """
    config = settings.get_ice_servers()
    return JSONResponse(content=config)


@router.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "service": "webrtc-video-call",
        "turn_enabled": settings.TURN_ENABLED
    }
