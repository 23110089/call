"""
WebSocket Routes
Signaling server for WebRTC peer connections
"""
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.signaling import SignalingService

router = APIRouter()

# Room management
rooms: Dict[str, Set[WebSocket]] = {}

# Signaling service
signaling_service = SignalingService(rooms)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for WebRTC signaling
    Query param: /ws?room=room_id
    
    Handles:
    - offer/answer exchange
    - ICE candidates exchange
    - Room management
    """
    await signaling_service.handle_connection(websocket)
