import sqlite3

# Connect to database
database = sqlite3.connect("surgitrack.db")

cursor = database.cursor()

# Get all records
cursor.execute("""
SELECT
    id,
    rfid_number,
    instrument_name,
    detection_time,
    removal_time
FROM instrument_logs
ORDER BY id
""")

rows = cursor.fetchall()

print("\n================ SURGITRACK DATABASE ================\n")

if not rows:
    print("Database is empty.")

else:

    print(
        f"{'ID':<5}"
        f"{'RFID':<18}"
        f"{'INSTRUMENT':<15}"
        f"{'DETECTION TIME':<22}"
        f"{'REMOVAL TIME':<22}"
    )

    print("-" * 82)

    for row in rows:

        id, rfid, instrument, detection, removal = row

        print(
            f"{id:<5}"
            f"{rfid:<18}"
            f"{instrument:<15}"
            f"{str(detection):<22}"
            f"{str(removal):<22}"
        )

print("\n======================================================")

database.close()