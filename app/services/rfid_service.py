from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Instrument

from .serial_reader import (
    serial_reader,
)


class RFIDService:

    def __init__(self):

        self.serial_reader = (
            serial_reader
        )

        self.last_scan = None

        # Kept for compatibility with
        # older verification code.
        self.detected_tags = []


    # =====================================================
    # CONNECT ARDUINO
    # =====================================================

    def connect(self):

        return (
            self.serial_reader.connect()
        )


    # =====================================================
    # DISCONNECT ARDUINO
    # =====================================================

    def disconnect(self):

        return (
            self.serial_reader.disconnect()
        )


    # =====================================================
    # HARDWARE STATUS
    # =====================================================

    def status(self):

        reader_status = (
            self.serial_reader.status()
        )

        return {
            "connected":
                reader_status[
                    "connected"
                ],

            "port":
                reader_status[
                    "port"
                ],

            "baudrate":
                reader_status[
                    "baudrate"
                ],

            "last_scan":
                self.last_scan,
        }


    # =====================================================
    # LIVE RFID → MASTER DATABASE COMPARISON
    # =====================================================

    def read_and_compare(
        self,
        db: Session,
    ):

        scan = (
            self.serial_reader.read_scan()
        )

        # Nothing received yet.
        if scan is None:

            return {
                "status": "waiting",
                "matched": False,
                "message":
                    "Waiting for RFID scan",
            }


        raw_message = (
            scan.get(
                "raw_message"
            )
        )

        rfid_data = (
            scan.get(
                "rfid"
            )
        )


        # Arduino may send startup/banner text.
        if rfid_data is None:

            return {
                "status": "ignored",
                "matched": False,
                "raw_message":
                    raw_message,
                "message":
                    "Non-RFID Arduino message",
            }


        rfid_uid = (
            rfid_data[
                "rfid_uid"
            ]
            .strip()
            .upper()
        )

        reported_name = (
            rfid_data[
                "instrument_name"
            ]
            .strip()
            .upper()
        )


        # =============================================
        # MASTER DATABASE LOOKUP
        # =============================================

        instrument = (
            db.query(
                Instrument
            )
            .filter(
                Instrument.rfid_uid
                == rfid_uid
            )
            .first()
        )


        scanned_at = (
            datetime.now()
            .isoformat()
        )


        # =============================================
        # UNKNOWN RFID
        # =============================================

        if instrument is None:

            result = {
                "status":
                    "unknown",

                "matched":
                    False,

                "rfid_uid":
                    rfid_uid,

                "reported_name":
                    reported_name,

                "instrument_name":
                    None,

                "scanned_at":
                    scanned_at,

                "raw_message":
                    raw_message,

                "message":
                    (
                        "RFID UID not found "
                        "in master database"
                    ),
            }

            self.last_scan = result

            return result


        # =============================================
        # INACTIVE INSTRUMENT
        # =============================================

        if not instrument.is_active:

            result = {
                "status":
                    "inactive",

                "matched":
                    False,

                "rfid_uid":
                    rfid_uid,

                "reported_name":
                    reported_name,

                "instrument_name":
                    instrument.name,

                "instrument_type":
                    instrument.instrument_type,

                "scanned_at":
                    scanned_at,

                "raw_message":
                    raw_message,

                "message":
                    (
                        "Instrument exists "
                        "but is inactive"
                    ),
            }

            self.last_scan = result

            return result


        # =============================================
        # VALID MASTER DATABASE MATCH
        # =============================================

        result = {
            "status":
                "pending_confirmation",

            "matched":
                True,

            "rfid_uid":
                rfid_uid,

            "reported_name":
                reported_name,

            "instrument_name":
                instrument.name,

            "instrument_type":
                instrument.instrument_type,

            "inventory_status":
                instrument.status,

            "scanned_at":
                scanned_at,

            "raw_message":
                raw_message,

            "message":
                (
                    "Instrument matched "
                    "with master database"
                ),
        }


        # Keep last successful UID available
        # for older verification code.
        if (
            rfid_uid
            not in self.detected_tags
        ):

            self.detected_tags.append(
                rfid_uid
            )


        self.last_scan = result

        return result


    # =====================================================
    # OLD COMPATIBILITY METHOD
    # =====================================================

    def scan(self):

        return {
            "timestamp":
                datetime.now()
                .isoformat(),

            "tags":
                self.detected_tags,
        }


    # =====================================================
    # MOCK SUPPORT
    # =====================================================

    def set_mock_tags(
        self,
        tags,
    ):

        self.detected_tags = (
            list(tags)
        )


rfid_service = RFIDService()