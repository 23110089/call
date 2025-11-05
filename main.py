from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from typing import Dict, Set
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="P2P Video Call")

# Store active connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.rooms: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        # Remove from all rooms
        for room_id in list(self.rooms.keys()):
            if client_id in self.rooms[room_id]:
                self.rooms[room_id].remove(client_id)
                if len(self.rooms[room_id]) == 0:
                    del self.rooms[room_id]
        logger.info(f"Client {client_id} disconnected. Total connections: {len(self.active_connections)}")

    def join_room(self, client_id: str, room_id: str):
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        self.rooms[room_id].add(client_id)
        logger.info(f"Client {client_id} joined room {room_id}")

    def get_room_members(self, room_id: str) -> list:
        return list(self.rooms.get(room_id, set()))

    async def send_to_client(self, client_id: str, message: dict):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to client {client_id}: {e}")

    async def broadcast_to_room(self, room_id: str, message: dict, exclude_client: str = None):
        if room_id in self.rooms:
            for client_id in self.rooms[room_id]:
                if client_id != exclude_client:
                    await self.send_to_client(client_id, message)

manager = ConnectionManager()

@app.get("/", response_class=HTMLResponse)
async def get_index():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            message_type = message.get("type")
            
            logger.info(f"Received from {client_id}: {message_type}")
            
            if message_type == "join":
                room_id = message.get("room")
                manager.join_room(client_id, room_id)
                
                # Get other members in the room
                members = manager.get_room_members(room_id)
                other_members = [m for m in members if m != client_id]
                
                # Notify the joining client about existing members
                await manager.send_to_client(client_id, {
                    "type": "room_members",
                    "members": other_members
                })
                
                # Notify other members about the new peer
                await manager.broadcast_to_room(room_id, {
                    "type": "new_peer",
                    "peer_id": client_id
                }, exclude_client=client_id)
            
            elif message_type == "offer":
                target_id = message.get("target")
                await manager.send_to_client(target_id, {
                    "type": "offer",
                    "offer": message.get("offer"),
                    "sender": client_id
                })
            
            elif message_type == "answer":
                target_id = message.get("target")
                await manager.send_to_client(target_id, {
                    "type": "answer",
                    "answer": message.get("answer"),
                    "sender": client_id
                })
            
            elif message_type == "ice_candidate":
                target_id = message.get("target")
                await manager.send_to_client(target_id, {
                    "type": "ice_candidate",
                    "candidate": message.get("candidate"),
                    "sender": client_id
                })
            
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"Error in websocket for {client_id}: {e}")
        manager.disconnect(client_id)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "active_connections": len(manager.active_connections),
        "active_rooms": len(manager.rooms)
    }
