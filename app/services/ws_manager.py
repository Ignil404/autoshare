import asyncio
import json
import logging
from typing import Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("autoshare.ws")

_connections: Set[WebSocket] = set()


async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    _connections.add(websocket)
    logger.info("WS client connected (%d total)", len(_connections))
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        _connections.discard(websocket)
        logger.info("WS client disconnected (%d total)", len(_connections))


async def broadcast(event: dict):
    dead = set()
    for ws in _connections:
        try:
            await ws.send_json(event)
        except Exception:
            dead.add(ws)
    _connections.difference_update(dead)


def broadcast_sync(event: dict):
    if not _connections:
        return
    loop = None
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        asyncio.ensure_future(broadcast(event))
    else:
        asyncio.run(broadcast(event))
