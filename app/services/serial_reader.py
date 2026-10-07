class SerialReader:

    def __init__(self, port=None, baudrate=9600):

        self.port = port
        self.baudrate = baudrate
        self.connected = False

    def connect(self):

        print(
            f"Serial connection requested: "
            f"{self.port}"
        )

        self.connected = True

    def disconnect(self):

        self.connected = False

    def read(self):

        if not self.connected:
            return None

        return None