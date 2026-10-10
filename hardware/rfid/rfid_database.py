import serial
import sqlite3
import time
from datetime import datetime

# ==============================
# SETTINGS
# ==============================

PORT = "COM15"
BAUD_RATE = 9600

# ==============================
# RFID DETAILS
# ==============================

SCISSOR_UID = "91:9C:92:66"
SCALPEL_UID = "A0:C2:5E:54"

# ==============================
# DATABASE
# ==============================

db = sqlite3.connect("surgitrack.db")

cursor = db.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS instrument_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rfid_number TEXT,
    instrument_name TEXT,
    detection_time TEXT,
    removal_time TEXT
)
""")

db.commit()

# ==============================
# ARDUINO
# ==============================

arduino = serial.Serial(
    PORT,
    BAUD_RATE,
    timeout=1
)

time.sleep(2)

print("======================================")
print("       SURGITRACK LIVE DATABASE")
print("======================================")
print("Arduino connected")
print("Database connected")
print("Waiting for RFID...")
print()

# Currently active instrument
current_rfid = None


# ==============================
# MAIN LOOP
# ==============================

while True:

    try:

        line = arduino.readline().decode(
            "utf-8",
            errors="ignore"
        ).strip()

        if not line:
            continue

        print("Arduino:", line)

        # --------------------------
        # SCISSOR
        # --------------------------

        if "INSTRUMENT 1 ON TRAY: SCISSOR" in line:

            rfid = SCISSOR_UID
            instrument = "SCISSOR"


        # --------------------------
        # SCALPEL
        # --------------------------

        elif "INSTRUMENT 2 ON TRAY: SCALPEL" in line:

            rfid = SCALPEL_UID
            instrument = "SCALPEL"


        # Ignore everything else
        else:

            continue


        # --------------------------
        # Avoid duplicate detection
        # --------------------------

        if current_rfid == rfid:

            continue


        now = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )


        # --------------------------
        # Close previous instrument
        # --------------------------

        if current_rfid is not None:

            cursor.execute("""
                UPDATE instrument_logs
                SET removal_time = ?
                WHERE rfid_number = ?
                AND removal_time IS NULL
            """, (
                now,
                current_rfid
            ))

            db.commit()

            print(
                "Previous instrument removed:",
                current_rfid
            )


        # --------------------------
        # Insert new instrument
        # --------------------------

        cursor.execute("""
            INSERT INTO instrument_logs
            (
                rfid_number,
                instrument_name,
                detection_time,
                removal_time
            )
            VALUES (?, ?, ?, NULL)
        """, (
            rfid,
            instrument,
            now
        ))

        db.commit()


        # --------------------------
        # Update current instrument
        # --------------------------

        current_rfid = rfid


        print()
        print("******** DATABASE UPDATED ********")
        print("RFID       :", rfid)
        print("Instrument :", instrument)
        print("Detected   :", now)
        print("**********************************")
        print()


    except KeyboardInterrupt:

        print("\nStopping SurgiTrack...")

        break


    except Exception as e:

        print("ERROR:", e)


# ==============================
# CLOSE
# ==============================

arduino.close()
db.close()