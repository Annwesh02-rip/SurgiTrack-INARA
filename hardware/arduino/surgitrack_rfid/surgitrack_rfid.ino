#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 10
#define RST_PIN 7

MFRC522 rfid(SS_PIN, RST_PIN);


// ==============================
// RFID UIDs
// ==============================

byte SCISSOR[] = {
  0x91,
  0x9C,
  0x92,
  0x66
};

byte SCALPEL[] = {
  0xA0,
  0xC2,
  0x5E,
  0x54
};


// ==============================
// UID COMPARISON
// ==============================

bool compareUID(
  byte *cardUID,
  byte *knownUID,
  byte uidSize
) {

  if (uidSize != 4) {
    return false;
  }

  for (byte i = 0; i < 4; i++) {

    if (cardUID[i] != knownUID[i]) {
      return false;
    }
  }

  return true;
}


// ==============================
// PRINT RFID UID
// ==============================

void printUID() {

  Serial.print("RFID UID: ");

  for (
    byte i = 0;
    i < rfid.uid.size;
    i++
  ) {

    if (rfid.uid.uidByte[i] < 0x10) {
      Serial.print("0");
    }

    Serial.print(
      rfid.uid.uidByte[i],
      HEX
    );

    if (
      i < rfid.uid.size - 1
    ) {
      Serial.print(":");
    }
  }

  Serial.println();
}


// ==============================
// SETUP
// ==============================

void setup() {

  Serial.begin(9600);

  SPI.begin();

  rfid.PCD_Init();

  delay(500);

  Serial.println(
    "================================"
  );

  Serial.println(
    "       SURGITRACK RFID"
  );

  Serial.println(
    "================================"
  );

  Serial.println(
    "Scanning continuously..."
  );

  Serial.println();
}


// ==============================
// MAIN LOOP
// ==============================

void loop() {

  // No RFID tag available
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }

  // Unable to read RFID UID
  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }


  // ============================
  // PRINT UID
  // ============================

  printUID();


  // ============================
  // SCISSOR
  // ============================

  if (
    compareUID(
      rfid.uid.uidByte,
      SCISSOR,
      rfid.uid.size
    )
  ) {

    Serial.println(
      "INSTRUMENT 1 ON TRAY: SCISSOR"
    );
  }


  // ============================
  // SCALPEL
  // ============================

  else if (
    compareUID(
      rfid.uid.uidByte,
      SCALPEL,
      rfid.uid.size
    )
  ) {

    Serial.println(
      "INSTRUMENT 2 ON TRAY: SCALPEL"
    );
  }


  // ============================
  // UNKNOWN RFID
  // ============================

  else {

    Serial.println(
      "UNKNOWN RFID TAG"
    );
  }


  Serial.println(
    "--------------------------------"
  );


  // Stop communication with tag
  rfid.PICC_HaltA();

  rfid.PCD_StopCrypto1();


  // Small debounce delay
  delay(500);
}