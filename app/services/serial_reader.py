import re
import threading
import time

import serial
from serial import SerialException


# =========================================================
# KNOWN DEMO RFID TAGS
# =========================================================

KNOWN_TAGS = {
    "91:9C:92:66": "SCISSOR",
    "A0:C2:5E:54": "SCALPEL",
}


class SerialReader:

    def __init__(
        self,
        port: str = "COM15",
        baudrate: int = 9600,
        timeout: float = 1.0,
    ):

        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout

        self.serial_connection = None

        self.connected = False

        self.last_error = None

        # RLock lets reconnect logic safely
        # call connection helpers.
        self.lock = threading.RLock()

    # =====================================================
    # INTERNAL CLOSE
    # =====================================================

    def _close_connection_no_lock(
        self
    ):

        connection = (
            self.serial_connection
        )

        if connection is not None:

            try:

                if connection.is_open:

                    connection.close()

            except Exception:
                pass

        self.serial_connection = None

        self.connected = False

    # =====================================================
    # INTERNAL OPEN
    # =====================================================

    def _open_connection_no_lock(
        self
    ):

        self._close_connection_no_lock()

        try:

            connection = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=self.timeout,
                write_timeout=1,
            )

            # Arduino Uno normally resets when
            # the serial port is opened.
            time.sleep(2)

            # Discard Arduino startup garbage/banner.
            try:
                connection.reset_input_buffer()
            except Exception:
                pass

            self.serial_connection = (
                connection
            )

            self.connected = bool(
                connection.is_open
            )

            self.last_error = None

            return self.connected

        except (
            SerialException,
            OSError,
        ) as exc:

            self.serial_connection = None

            self.connected = False

            self.last_error = str(
                exc
            )

            return False

    # =====================================================
    # CONNECT
    # =====================================================

    def connect(
        self
    ):

        with self.lock:

            connection = (
                self.serial_connection
            )

            if connection is not None:

                try:

                    if connection.is_open:

                        self.connected = True

                        self.last_error = None

                        return {
                            "connected":
                                True,

                            "port":
                                self.port,

                            "baudrate":
                                self.baudrate,

                            "message":
                                "Arduino already connected",
                        }

                except Exception:
                    pass

            opened = (
                self._open_connection_no_lock()
            )

            if opened:

                return {
                    "connected":
                        True,

                    "port":
                        self.port,

                    "baudrate":
                        self.baudrate,

                    "message":
                        "Arduino connected",
                }

            return {
                "connected":
                    False,

                "port":
                    self.port,

                "baudrate":
                    self.baudrate,

                "message":
                    (
                        self.last_error
                        or
                        "Unable to open Arduino serial port"
                    ),
            }

    # =====================================================
    # DISCONNECT
    # =====================================================

    def disconnect(
        self
    ):

        with self.lock:

            self._close_connection_no_lock()

            self.last_error = None

        return {
            "connected":
                False,

            "port":
                self.port,

            "baudrate":
                self.baudrate,

            "message":
                "Arduino disconnected",
        }

    # =====================================================
    # ENSURE CONNECTION
    # =====================================================

    def ensure_connected(
        self
    ):

        with self.lock:

            connection = (
                self.serial_connection
            )

            if connection is not None:

                try:

                    if connection.is_open:

                        self.connected = True

                        return True

                except Exception:
                    pass

            return (
                self._open_connection_no_lock()
            )

    # =====================================================
    # READ RAW LINE
    # =====================================================

    def read_line(
        self
    ):
        """
        Read one Arduino line.

        If Windows temporarily drops COM15,
        SurgiTrack automatically attempts one
        reconnect instead of permanently setting
        RFID connected=False.
        """

        for attempt in range(
            2
        ):

            if not self.ensure_connected():

                return None

            try:

                with self.lock:

                    connection = (
                        self.serial_connection
                    )

                    if (
                        connection is None
                        or
                        not connection.is_open
                    ):

                        self.connected = False

                        continue

                    raw_data = (
                        connection.readline()
                    )

                if not raw_data:

                    # Timeout with no RFID data is
                    # NOT a disconnection.
                    self.connected = True

                    return None

                message = (
                    raw_data.decode(
                        "utf-8",
                        errors="ignore",
                    )
                    .strip()
                )

                self.connected = True

                self.last_error = None

                if not message:

                    return None

                return message

            except (
                SerialException,
                OSError,
            ) as exc:

                self.last_error = str(
                    exc
                )

                with self.lock:

                    self._close_connection_no_lock()

                # First failure:
                # wait briefly and reconnect.
                if attempt == 0:

                    time.sleep(
                        0.25
                    )

                    continue

                self.connected = False

                return None

            except Exception as exc:

                self.last_error = str(
                    exc
                )

                return None

        return None

    # =====================================================
    # NORMALIZE UID
    # =====================================================

    @staticmethod
    def normalize_uid(
        uid: str
    ):

        if not uid:

            return ""

        parts = re.findall(
            r"[0-9A-Fa-f]{1,2}",
            uid
        )

        if not parts:

            return ""

        normalized_parts = []

        for part in parts:

            normalized_parts.append(
                part
                .upper()
                .zfill(2)
            )

        return ":".join(
            normalized_parts
        )

    # =====================================================
    # PARSE RFID MESSAGE
    # =====================================================

    def parse_message(
        self,
        message: str,
    ):
        """
        Arduino output example:

            RFID UID: 91:9C:92:66
            INSTRUMENT 1 ON TRAY: SCISSOR

        We use the UID line as the real RFID event.

        This also allows unknown RFID tags to
        reach FastAPI instead of being silently
        ignored.
        """

        if not message:

            return None

        clean_message = (
            message
            .strip()
        )

        # -------------------------------------------------
        # REAL RFID UID LINE
        # -------------------------------------------------

        uid_match = re.search(
            r"RFID\s*UID\s*:\s*"
            r"([0-9A-Fa-f]{1,2}"
            r"(?:\s*:\s*[0-9A-Fa-f]{1,2}){3,})",
            clean_message,
            flags=re.IGNORECASE,
        )

        if uid_match:

            rfid_uid = (
                self.normalize_uid(
                    uid_match.group(
                        1
                    )
                )
            )

            instrument_name = (
                KNOWN_TAGS.get(
                    rfid_uid,
                    "UNKNOWN",
                )
            )

            return {
                "rfid_uid":
                    rfid_uid,

                "instrument_name":
                    instrument_name,
            }

        # -------------------------------------------------
        # Old Arduino compatibility
        # -------------------------------------------------

        upper_message = (
            clean_message
            .upper()
        )

        if (
            "INSTRUMENT 1 ON TRAY: SCISSOR"
            in upper_message
        ):

            return {
                "rfid_uid":
                    "91:9C:92:66",

                "instrument_name":
                    "SCISSOR",
            }

        if (
            "INSTRUMENT 2 ON TRAY: SCALPEL"
            in upper_message
        ):

            return {
                "rfid_uid":
                    "A0:C2:5E:54",

                "instrument_name":
                    "SCALPEL",
            }

        return None

    # =====================================================
    # READ ONE RFID SCAN
    # =====================================================

    def read_scan(
        self
    ):

        message = (
            self.read_line()
        )

        if message is None:

            return None

        result = (
            self.parse_message(
                message
            )
        )

        if result is None:

            return {
                "raw_message":
                    message,

                "rfid":
                    None,
            }

        return {
            "raw_message":
                message,

            "rfid":
                result,
        }

    # =====================================================
    # STATUS
    # =====================================================

    def status(
        self
    ):

        with self.lock:

            serial_open = False

            connection = (
                self.serial_connection
            )

            if connection is not None:

                try:

                    serial_open = bool(
                        connection.is_open
                    )

                except Exception:

                    serial_open = False

            # Trust the real serial handle.
            self.connected = (
                serial_open
            )

            return {
                "connected":
                    serial_open,

                "port":
                    self.port,

                "baudrate":
                    self.baudrate,

                "last_error":
                    self.last_error,
            }


# =========================================================
# SINGLE SHARED READER
# =========================================================

serial_reader = SerialReader()