"""
WebRTC Signaling Service
Manages WebSocket connections and message routing between peers
"""
import json
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect


class SignalingService:
    """Handles WebRTC signaling between peers"""
    
    def __init__(self, rooms: Dict[str, Set[WebSocket]]):
        self.rooms = rooms
    
    def _get_room_from_query(self, websocket: WebSocket) -> str:
        """Extract room ID from WebSocket query string"""
        query = websocket.scope.get("query_string", b"").decode()
        if query:
            for part in query.split("&"):
                if part.startswith("room="):
                    return part.split("=", 1)[1] or "default"
        return "default"
    
    def _get_client_ip(self, websocket: WebSocket) -> str:
        """Get client IP address"""
        return websocket.client.host if websocket.client else "unknown"
    
    async def handle_connection(self, websocket: WebSocket):
        """
        Handle new WebSocket connection
        Manages room joining, message routing, and disconnection
        """
        await websocket.accept()
        
        # Extract room ID and client info
        room = self._get_room_from_query(websocket)
        client_ip = self._get_client_ip(websocket)
        
        # Add client to room
        if room not in self.rooms:
            self.rooms[room] = set()
        
        # Notify existing peers about new peer
        is_first_peer = len(self.rooms[room]) == 0
        for peer in list(self.rooms[room]):
            try:
                # Tell existing peer someone joined (they should create offer)
                await peer.send_text(json.dumps({"type": "peer-joined"}))
                print(f"📣 Notified existing peer about new joiner")
            except Exception as e:
                print(f"⚠️ Failed to notify peer: {e}")
        
        self.rooms[room].add(websocket)
        
        print(f"🔗 Client ({client_ip}) joined room: {room} | Total: {len(self.rooms[room])} | First: {is_first_peer}")
        
        # Tell new client if they should wait or initiate
        if is_first_peer:
            await websocket.send_text(json.dumps({"type": "room-status", "first": True}))
        else:
            await websocket.send_text(json.dumps({"type": "room-status", "first": False}))
        
        try:
            # Message handling loop
            while True:
                data = await websocket.receive_text()
                await self._handle_message(websocket, room, client_ip, data)
                
        except WebSocketDisconnect:
            # Clean up on disconnect
            await self._handle_disconnect(websocket, room, client_ip)
            
        except Exception as e:
            print(f"❌ WebSocket error ({client_ip}): {e}")
            await self._handle_disconnect(websocket, room, client_ip)
    
    async def _handle_message(
        self, 
        sender: WebSocket, 
        room: str, 
        sender_ip: str, 
        data: str
    ):
        """
        Handle incoming signaling message
        Routes offer/answer/candidate to other peers in room
        """
        try:
            # Parse message
            message = json.loads(data)
            msg_type = message.get("type", "unknown")
            
            # Log signaling message
            print(f"📤 [{room}] {sender_ip} → {msg_type}")
            
            # Forward to all other clients in room
            sent_count = 0
            for client in list(self.rooms[room]):
                if client != sender:
                    try:
                        await client.send_text(data)
                        sent_count += 1
                    except Exception as e:
                        print(f"⚠️ Failed to send to peer: {e}")
                        if client in self.rooms[room]:
                            self.rooms[room].remove(client)
            
            # Warn if message wasn't forwarded
            if sent_count == 0 and len(self.rooms[room]) > 1:
                print(f"⚠️ [{room}] Message not forwarded - check room state")
                
        except json.JSONDecodeError:
            print(f"⚠️ Invalid JSON from {sender_ip}")
        except Exception as e:
            print(f"❌ Message handling error: {e}")
    
    async def _handle_disconnect(
        self, 
        websocket: WebSocket, 
        room: str, 
        client_ip: str
    ):
        """Handle client disconnect and cleanup"""
        if websocket in self.rooms.get(room, set()):
            self.rooms[room].remove(websocket)
        
        print(f"❌ Client ({client_ip}) left room: {room} | Remaining: {len(self.rooms.get(room, set()))}")
        
        # Clean up empty rooms
        if room in self.rooms and not self.rooms[room]:
            del self.rooms[room]
