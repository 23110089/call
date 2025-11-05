import os
import json
from typing import Dict, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Chứa danh sách client theo room
rooms: Dict[str, Set[WebSocket]] = {}

# Mount thư mục static (frontend)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def index():
    """Trả về trang HTML chính"""
    html_path = os.path.join("static", "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())


@app.get("/config")
async def get_config():
    """Trả về cấu hình ICE servers (STUN/TURN)"""
    ice_json = os.getenv("ICE_SERVERS_JSON")
    if ice_json:
        try:
            return JSONResponse(content=json.loads(ice_json))
        except Exception:
            pass

    # ICE servers mặc định - hỗ trợ kết nối qua các mạng khác nhau
    iceServers = [
        # Google STUN servers
        {"urls": "stun:stun.l.google.com:19302"},
        {"urls": "stun:stun1.l.google.com:19302"},
        # TURN servers miễn phí (có thể thay bằng server riêng)
        {
            "urls": "turn:openrelay.metered.ca:80",
            "username": "openrelayproject",
            "credential": "openrelayproject"
        },
        {
            "urls": "turn:openrelay.metered.ca:443",
            "username": "openrelayproject",
            "credential": "openrelayproject"
        },
        {
            "urls": "turn:openrelay.metered.ca:443?transport=tcp",
            "username": "openrelayproject",
            "credential": "openrelayproject"
        }
    ]
    
    # Cho phép override bằng biến môi trường
    stun = os.getenv("STUN_URL")
    turn = os.getenv("TURN_URL")
    if stun or turn:
        iceServers = []
        if stun:
            iceServers.append({"urls": stun})
        if turn:
            turn_user = os.getenv("TURN_USER", "")
            turn_pass = os.getenv("TURN_PASS", "")
            iceServers.append({
                "urls": turn,
                "username": turn_user,
                "credential": turn_pass
            })
    
    return JSONResponse(content={"iceServers": iceServers})


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket dùng làm signaling server cho WebRTC
    Query param: /ws?room=room_id
    """
    await websocket.accept()

    # Lấy room từ query string
    query = websocket.scope.get("query_string", b"").decode()
    room = "default"
    if query:
        for part in query.split("&"):
            if part.startswith("room="):
                room = part.split("=", 1)[1] or "default"

    # Thêm client vào room
    if room not in rooms:
        rooms[room] = set()
    rooms[room].add(websocket)
    print(f"🔗 Client joined room: {room} | Total: {len(rooms[room])}")

    try:
        while True:
            data = await websocket.receive_text()
            # Gửi lại dữ liệu cho các client khác trong cùng room
            for client in list(rooms[room]):
                if client != websocket:
                    try:
                        await client.send_text(data)
                    except Exception:
                        rooms[room].remove(client)
    except WebSocketDisconnect:
        # Client rời room
        rooms[room].remove(websocket)
        print(f"❌ Client left room: {room} | Remaining: {len(rooms[room])}")
        if not rooms[room]:
            del rooms[room]


# Render tự động chạy uvicorn main:app --host 0.0.0.0 --port $PORT
# nên KHÔNG cần uvicorn.run() ở cuối
