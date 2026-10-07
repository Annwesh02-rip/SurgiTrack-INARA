from app.database import Base, engine, SessionLocal
from app import models


# ---------------------------------------------------------
# DATABASE SETUP
# ---------------------------------------------------------

print()
print("=" * 70)
print("                 SURGITRACK DATABASE SEED")
print("=" * 70)

print()
print("Creating database tables...")

Base.metadata.create_all(bind=engine)

print("Database tables are ready.")


# ---------------------------------------------------------
# SEED DATA
# ---------------------------------------------------------

instruments = [
    {
        "rfid_uid": "RF001A23",
        "name": "Forceps 01",
        "instrument_type": "forceps",
        "status": "available",
        "is_active": True,
        "description": "Surgical forceps with RFID tag RF001A23"
    },
    {
        "rfid_uid": "RF001A24",
        "name": "Forceps 02",
        "instrument_type": "forceps",
        "status": "available",
        "is_active": True,
        "description": "Surgical forceps with RFID tag RF001A24"
    },
    {
        "rfid_uid": "RF001B31",
        "name": "Hemostat 01",
        "instrument_type": "hemostat",
        "status": "available",
        "is_active": True,
        "description": "Hemostat with RFID tag RF001B31"
    },
    {
        "rfid_uid": "RF002C12",
        "name": "Scalpel 01",
        "instrument_type": "scalpel",
        "status": "available",
        "is_active": True,
        "description": "Surgical scalpel with RFID tag RF002C12"
    },
    {
        "rfid_uid": "RF002C13",
        "name": "Mayo Scissors 01",
        "instrument_type": "mayo_scissors",
        "status": "available",
        "is_active": True,
        "description": "Mayo scissors with RFID tag RF002C13"
    },
    {
        "rfid_uid": "RF003D10",
        "name": "Syringe 01",
        "instrument_type": "syringe",
        "status": "available",
        "is_active": True,
        "description": "Surgical syringe with RFID tag RF003D10"
    }
]


# ---------------------------------------------------------
# INSERT DATA
# ---------------------------------------------------------

db = SessionLocal()

try:

    print()
    print("Checking existing instruments...")

    added_count = 0
    skipped_count = 0

    for instrument_data in instruments:

        existing_instrument = (
            db.query(models.Instrument)
            .filter(
                models.Instrument.rfid_uid
                == instrument_data["rfid_uid"]
            )
            .first()
        )

        if existing_instrument:

            print(
                f"SKIPPED: "
                f"{instrument_data['rfid_uid']} "
                f"already exists."
            )

            skipped_count += 1

            continue

        instrument = models.Instrument(
            rfid_uid=instrument_data["rfid_uid"],
            name=instrument_data["name"],
            instrument_type=instrument_data["instrument_type"],
            status=instrument_data["status"],
            is_active=instrument_data["is_active"],
            description=instrument_data["description"]
        )

        db.add(instrument)

        print(
            f"ADDED: "
            f"{instrument_data['rfid_uid']} "
            f"-> {instrument_data['name']}"
        )

        added_count += 1

    db.commit()


    # -----------------------------------------------------
    # DISPLAY FINAL DATA
    # -----------------------------------------------------

    print()
    print("=" * 70)
    print("                 DATABASE SEED COMPLETE")
    print("=" * 70)

    print()
    print(f"New instruments added : {added_count}")
    print(f"Existing instruments  : {skipped_count}")

    print()
    print("Current instruments:")
    print("-" * 70)

    all_instruments = (
        db.query(models.Instrument)
        .order_by(models.Instrument.rfid_uid)
        .all()
    )

    for instrument in all_instruments:

        print(
            f"RFID: {instrument.rfid_uid} | "
            f"Name: {instrument.name} | "
            f"Type: {instrument.instrument_type} | "
            f"Status: {instrument.status}"
        )

    print()
    print(f"Total instruments: {len(all_instruments)}")

except Exception as e:

    db.rollback()

    print()
    print("=" * 70)
    print("                 DATABASE SEED FAILED")
    print("=" * 70)

    print()
    print("Error:")
    print(e)

    raise

finally:

    db.close()

    print()
    print("Database session closed.")