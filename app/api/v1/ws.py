from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.ws_manager import ws_endpoint

router = APIRouter()


@router.websocket("/ws")
async def websocket_route(websocket: WebSocket):
    await ws_endpoint(websocket)
