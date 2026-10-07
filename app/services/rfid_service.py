from datetime import datetime


class RFIDService:
    def __init__(self):
        self.detected_tags = []

    def scan(self):
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "tags": self.detected_tags
        }

    def set_mock_tags(self, tags):
        self.detected_tags = tags


# Create the RFID service object
rfid_service = RFIDService()