from sqlalchemy.orm import sessionmaker

from app.database import engine
from app.models import Instrument


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


MASTER_INSTRUMENTS = [
    {
        "rfid_uid": "91:9C:92:66",
        "name": "SCISSOR",
        "instrument_type": "Surgical Instrument",
        "status": "available",
        "is_active": True,
        "description": "RFID-tagged surgical scissor",
    },
    {
        "rfid_uid": "A0:C2:5E:54",
        "name": "SCALPEL",
        "instrument_type": "Surgical Instrument",
        "status": "available",
        "is_active": True,
        "description": "RFID-tagged surgical scalpel",
    },
]


def seed_master_instruments():

    db = SessionLocal()

    try:

        for item in MASTER_INSTRUMENTS:

            existing = (
                db.query(Instrument)
                .filter(
                    Instrument.rfid_uid
                    == item["rfid_uid"]
                )
                .first()
            )

            if existing:

                existing.name = item["name"]

                existing.instrument_type = (
                    item["instrument_type"]
                )

                existing.status = item["status"]

                existing.is_active = (
                    item["is_active"]
                )

                existing.description = (
                    item["description"]
                )

                print(
                    "UPDATED:",
                    item["rfid_uid"],
                    item["name"],
                )

            else:

                instrument = Instrument(
                    rfid_uid=item["rfid_uid"],
                    name=item["name"],
                    instrument_type=(
                        item["instrument_type"]
                    ),
                    status=item["status"],
                    is_active=item["is_active"],
                    description=item["description"],
                )

                db.add(
                    instrument
                )

                print(
                    "ADDED:",
                    item["rfid_uid"],
                    item["name"],
                )

        db.commit()

        print()
        print(
            "MASTER INSTRUMENT DATABASE READY"
        )

    except Exception as exc:

        db.rollback()

        print(
            "ERROR:",
            exc
        )

        raise

    finally:

        db.close()


if __name__ == "__main__":

    seed_master_instruments()