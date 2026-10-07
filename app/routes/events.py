from fastapi import (
    APIRouter,
    Depends,
    WebSocket,
    WebSocketDisconnect
)

from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Event

from ..services.websocket_manager import manager


router = APIRouter(
    prefix="/events",
    tags=["Events"]
)


@router.get("/")
def get_events(
    db: Session = Depends(get_db)
):

    return db.query(Event).order_by(
        Event.created_at.desc()
    ).limit(100).all()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket
):

    await manager.connect(websocket)

    try:

        while True:

            data = await websocket.receive_text()

            await manager.broadcast({
                "type": "event",
                "message": data
            })

    except WebSocketDisconnect:

        manager.disconnect(websocket)