import serial
import time

PORT = "COM15"
BAUD_RATE = 9600

print("Connecting to Arduino...")

arduino = serial.Serial(
    PORT,
    BAUD_RATE,
    timeout=1
)

time.sleep(2)

print("Arduino connected!")
print("Waiting for RFID data...")
print("--------------------------------")

while True:

    data = arduino.readline()

    if data:

        message = data.decode(
            "utf-8",
            errors="ignore"
        ).strip()

        print(message)