"""
WebRTC Video Call Application - Main Entry Point
Self-hosted TURN server for cross-network connectivity
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.routes import main_routes, websocket_routes
from app.config import settings

# Initialize FastAPI app
app = FastAPI(
    title="WebRTC Video Call",
    description="P2P video calling with self-hosted TURN server",
    version="2.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routes
app.include_router(main_routes.router)
app.include_router(websocket_routes.router)

@app.on_event("startup")
async def startup_event():
    """Application startup event"""
    print("=" * 50)
    print("🚀 WebRTC Video Call Server Starting...")
    print(f"📡 Server: {settings.HOST}:{settings.PORT}")
    print(f"🔄 TURN Server: {settings.TURN_ENABLED}")
    if settings.TURN_ENABLED:
        print(f"🎯 TURN URL: turn:{settings.TURN_HOST}:{settings.TURN_PORT}")
    print("=" * 50)

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event"""
    print("👋 WebRTC Video Call Server Shutting Down...")
