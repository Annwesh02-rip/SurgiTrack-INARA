from pathlib import Path
import importlib.util
import sys

import torch
from PIL import Image
from torchvision import transforms


# =========================================================
# PATHS
# =========================================================

CURRENT_FILE = Path(__file__).resolve()

INFERENCE_DIR = CURRENT_FILE.parent

AI_ROOT = INFERENCE_DIR.parent

MODEL_SOURCE_PATH = (
    AI_ROOT
    / "src"
    / "ai"
    / "model.py"
)

MODEL_PATH = (
    AI_ROOT
    / "model"
    / "surgitrack_cnn.pth"
)


# =========================================================
# DEVICE
# =========================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


# =========================================================
# LOAD CNN CLASS DIRECTLY
# =========================================================

def load_model_class():
    """
    Load SurgicalInstrumentCNN directly from model.py.

    We intentionally DO NOT use:

        from ai.model import SurgicalInstrumentCNN

    This prevents the CNN package from colliding with
    SurgiTrack backend modules or another installed `ai`
    package.
    """

    if not MODEL_SOURCE_PATH.exists():

        raise FileNotFoundError(
            "CNN model source not found: "
            f"{MODEL_SOURCE_PATH}"
        )

    module_name = (
        "surgitrack_cnn_model_definition"
    )

    existing = sys.modules.get(
        module_name
    )

    if (
        existing is not None
        and hasattr(
            existing,
            "SurgicalInstrumentCNN"
        )
    ):

        return (
            existing
            .SurgicalInstrumentCNN
        )

    specification = (
        importlib.util.spec_from_file_location(
            module_name,
            str(
                MODEL_SOURCE_PATH
            )
        )
    )

    if (
        specification is None
        or
        specification.loader is None
    ):

        raise ImportError(
            "Unable to load CNN model source: "
            f"{MODEL_SOURCE_PATH}"
        )

    module = (
        importlib.util.module_from_spec(
            specification
        )
    )

    sys.modules[
        module_name
    ] = module

    try:

        specification.loader.exec_module(
            module
        )

    except Exception:

        sys.modules.pop(
            module_name,
            None
        )

        raise

    if not hasattr(
        module,
        "SurgicalInstrumentCNN"
    ):

        raise AttributeError(
            "model.py does not contain "
            "SurgicalInstrumentCNN."
        )

    return (
        module.SurgicalInstrumentCNN
    )


SurgicalInstrumentCNN = (
    load_model_class()
)


# =========================================================
# LOAD TRAINED MODEL
# =========================================================

def load_model():

    if not MODEL_PATH.exists():

        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}"
        )

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE
    )

    if (
        "class_names"
        not in checkpoint
    ):

        raise KeyError(
            "Checkpoint does not contain class_names."
        )

    if (
        "model_state_dict"
        not in checkpoint
    ):

        raise KeyError(
            "Checkpoint does not contain model_state_dict."
        )

    class_names = checkpoint[
        "class_names"
    ]

    image_size = checkpoint.get(
        "image_size",
        224
    )

    model = SurgicalInstrumentCNN(
        num_classes=len(
            class_names
        )
    )

    model.load_state_dict(
        checkpoint[
            "model_state_dict"
        ]
    )

    model.to(
        DEVICE
    )

    model.eval()

    return (
        model,
        class_names,
        image_size
    )


MODEL, CLASS_NAMES, IMAGE_SIZE = (
    load_model()
)


# =========================================================
# TRANSFORM
# =========================================================

TRANSFORM = transforms.Compose(
    [
        transforms.Resize(
            (
                IMAGE_SIZE,
                IMAGE_SIZE
            )
        ),

        transforms.ToTensor(),

        transforms.Normalize(
            mean=[
                0.485,
                0.456,
                0.406
            ],
            std=[
                0.229,
                0.224,
                0.225
            ]
        )
    ]
)


# =========================================================
# PREDICT PIL
# =========================================================

def predict_pil(
    image: Image.Image
):

    if image is None:

        raise ValueError(
            "Image cannot be None."
        )

    image = image.convert(
        "RGB"
    )

    tensor = (
        TRANSFORM(
            image
        )
        .unsqueeze(
            0
        )
        .to(
            DEVICE
        )
    )

    with torch.no_grad():

        logits = MODEL(
            tensor
        )

        probabilities = (
            torch.softmax(
                logits,
                dim=1
            )
        )

        confidence, prediction = (
            torch.max(
                probabilities,
                dim=1
            )
        )

    class_index = int(
        prediction.item()
    )

    confidence_value = float(
        confidence.item()
    )

    if (
        class_index < 0
        or
        class_index >=
        len(CLASS_NAMES)
    ):

        raise IndexError(
            "Invalid CNN class index: "
            f"{class_index}"
        )

    return {
        "class_name":
            str(
                CLASS_NAMES[
                    class_index
                ]
            ),

        "confidence":
            round(
                confidence_value,
                4
            )
    }


# =========================================================
# PREDICT FILE
# =========================================================

def predict_image(
    image_path
):

    image_path = Path(
        image_path
    )

    if not image_path.exists():

        raise FileNotFoundError(
            f"Image not found: {image_path}"
        )

    with Image.open(
        image_path
    ) as image:

        return predict_pil(
            image
        )


# =========================================================
# CLI
# =========================================================

if __name__ == "__main__":

    if len(sys.argv) != 2:

        print(
            "Usage: python predict.py <image_path>"
        )

        raise SystemExit(
            1
        )

    result = predict_image(
        sys.argv[1]
    )

    print(
        result
    )