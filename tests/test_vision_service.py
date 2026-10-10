from app.services.vision_service import VisionService


def test_multiple_cnn_models_are_combined():

    def scissors_cnn(image_path):
        return {
            "detections": [
                {
                    "instrument": "scissors",
                    "confidence": 0.95
                }
            ]
        }

    def forceps_cnn(image_path):
        return {
            "detections": [
                {
                    "instrument": "forceps",
                    "confidence": 0.91
                },
                {
                    "instrument": "forceps",
                    "confidence": 0.88
                }
            ]
        }

    service = VisionService(
        detectors={
            "scissors": scissors_cnn,
            "forceps": forceps_cnn
        }
    )

    result = service.detect_instruments("test_image.jpg")

    assert result["total"] == 3
    assert result["counts"]["scissors"] == 1
    assert result["counts"]["forceps"] == 2
    assert len(result["detections"]) == 3