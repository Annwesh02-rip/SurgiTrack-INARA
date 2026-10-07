class VisionService:

    def __init__(self):

        self.model_loaded = False

    def load_model(self):

        # Later:
        # Load PyTorch/CNN model here

        self.model_loaded = True

    def detect_instruments(self, image_path):

        # Temporary mock implementation

        return []


vision_service = VisionService()