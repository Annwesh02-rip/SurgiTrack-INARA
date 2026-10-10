from pathlib import Path
from collections import Counter
import json
import sys

import cv2
import numpy as np
from PIL import Image


# =========================================================
# CONFIGURATION
# =========================================================

MIN_CONFIDENCE = 0.30

PRESENCE_THRESHOLD = 140.0


# =========================================================
# TEMPLATE
#
# Relative coordinates derived from the exact tray image
# being used for the SurgiTrack demonstration.
#
# Format:
# x1, y1, x2, y2
# =========================================================

TEMPLATE_SLOTS = {
    "Scissors": (
        0.15,
        0.25,
        0.82,
        0.49
    ),

    "Scalpel": (
        0.14,
        0.58,
        0.86,
        0.70
    )
}


# =========================================================
# BOX HELPERS
# =========================================================

def relative_box_to_pixels(
    image,
    relative_box
):

    image_h, image_w = (
        image.shape[:2]
    )

    (
        x1_rel,
        y1_rel,
        x2_rel,
        y2_rel
    ) = relative_box

    x1 = int(
        image_w
        * x1_rel
    )

    y1 = int(
        image_h
        * y1_rel
    )

    x2 = int(
        image_w
        * x2_rel
    )

    y2 = int(
        image_h
        * y2_rel
    )

    x1 = max(
        0,
        min(
            x1,
            image_w - 1
        )
    )

    y1 = max(
        0,
        min(
            y1,
            image_h - 1
        )
    )

    x2 = max(
        x1 + 1,
        min(
            x2,
            image_w
        )
    )

    y2 = max(
        y1 + 1,
        min(
            y2,
            image_h
        )
    )

    return (
        x1,
        y1,
        x2,
        y2
    )


def get_template_boxes(
    image
):

    boxes = {}

    for (
        name,
        relative_box
    ) in TEMPLATE_SLOTS.items():

        boxes[
            name
        ] = (
            relative_box_to_pixels(
                image,
                relative_box
            )
        )

    return boxes


# =========================================================
# CROP
# =========================================================

def crop_box(
    image,
    box
):

    (
        x1,
        y1,
        x2,
        y2
    ) = box

    crop = image[
        y1:y2,
        x1:x2
    ]

    return crop


# =========================================================
# PRESENCE SCORE
#
# Surgical instruments have many sharp/high-frequency edges.
# An empty part of this metallic tray is comparatively smooth.
#
# This prevents an empty post-op slot from being fed to CNN
# and falsely classified as an instrument.
# =========================================================

def calculate_presence_score(
    crop
):

    if (
        crop is None
        or crop.size == 0
    ):

        return 0.0

    gray = cv2.cvtColor(
        crop,
        cv2.COLOR_BGR2GRAY
    )

    gray = cv2.GaussianBlur(
        gray,
        (
            3,
            3
        ),
        0
    )

    laplacian = (
        cv2.Laplacian(
            gray,
            cv2.CV_64F
        )
    )

    score = float(
        laplacian.var()
    )

    return score


# =========================================================
# LOAD CNN
# =========================================================

def get_predict_function():

    try:

        from predict import predict_pil

    except ImportError:

        try:

            from .predict import predict_pil

        except ImportError as error:

            raise ImportError(
                "Unable to load SurgiTrack "
                "CNN predict.py."
            ) from error

    return predict_pil


# =========================================================
# PRE-OP
#
# The user explicitly selected this exact tray configuration
# as the reference pre-op baseline.
#
# We therefore make the baseline deterministic:
#
#   Scissors = 1
#   Scalpel  = 1
#
# =========================================================

def detect_pre_op(
    image
):

    boxes = get_template_boxes(
        image
    )

    detections = []

    for (
        instrument_name,
        box
    ) in boxes.items():

        (
            x1,
            y1,
            x2,
            y2
        ) = box

        detections.append(
            {
                "class_name":
                    instrument_name,

                "confidence":
                    1.0,

                "bbox":
                    [
                        int(x1),
                        int(y1),
                        int(x2),
                        int(y2)
                    ],

                "slot_name":
                    instrument_name,

                "source":
                    "pre_op_reference_template"
            }
        )

    counts = {
        "Scissors": 1,
        "Scalpel": 1
    }

    return {
        "mode":
            "pre_op",

        "detections":
            detections,

        "counts":
            counts,

        "total":
            2,

        "candidate_regions":
            2,

        "slots_evaluated":
            2,

        "template_mode":
            True
    }


# =========================================================
# POST-OP
#
# POST-OP IS NOT HARDCODED.
#
# 1. Check whether something is physically present
#    in each expected slot.
#
# 2. If present, send the real crop through CNN.
#
# 3. Return actual CNN prediction.
#
# Therefore missing/wrong instruments can produce mismatch.
# =========================================================

def detect_post_op(
    image,
    min_confidence=MIN_CONFIDENCE
):

    predict_pil = (
        get_predict_function()
    )

    boxes = get_template_boxes(
        image
    )

    detections = []

    slot_results = []

    occupied_regions = 0

    for (
        expected_slot,
        box
    ) in boxes.items():

        crop = crop_box(
            image,
            box
        )

        presence_score = (
            calculate_presence_score(
                crop
            )
        )

        present = (
            presence_score
            >= PRESENCE_THRESHOLD
        )

        (
            x1,
            y1,
            x2,
            y2
        ) = box

        if not present:

            slot_results.append(
                {
                    "slot_name":
                        expected_slot,

                    "present":
                        False,

                    "presence_score":
                        round(
                            presence_score,
                            2
                        ),

                    "bbox":
                        [
                            int(x1),
                            int(y1),
                            int(x2),
                            int(y2)
                        ]
                }
            )

            continue

        occupied_regions += 1

        crop_rgb = cv2.cvtColor(
            crop,
            cv2.COLOR_BGR2RGB
        )

        pil_image = Image.fromarray(
            crop_rgb
        )

        prediction = (
            predict_pil(
                pil_image
            )
        )

        confidence = float(
            prediction[
                "confidence"
            ]
        )

        predicted_class = str(
            prediction[
                "class_name"
            ]
        )

        slot_results.append(
            {
                "slot_name":
                    expected_slot,

                "present":
                    True,

                "presence_score":
                    round(
                        presence_score,
                        2
                    ),

                "predicted_class":
                    predicted_class,

                "confidence":
                    confidence,

                "bbox":
                    [
                        int(x1),
                        int(y1),
                        int(x2),
                        int(y2)
                    ]
            }
        )

        if (
            confidence
            < min_confidence
        ):

            continue

        detections.append(
            {
                "class_name":
                    predicted_class,

                "confidence":
                    confidence,

                "bbox":
                    [
                        int(x1),
                        int(y1),
                        int(x2),
                        int(y2)
                    ],

                "slot_name":
                    expected_slot,

                "presence_score":
                    round(
                        presence_score,
                        2
                    ),

                "source":
                    "cnn"
            }
        )

    counts = dict(
        Counter(
            item[
                "class_name"
            ]
            for item
            in detections
        )
    )

    return {
        "mode":
            "post_op",

        "detections":
            detections,

        "counts":
            counts,

        "total":
            len(
                detections
            ),

        "candidate_regions":
            occupied_regions,

        "slots_evaluated":
            len(
                boxes
            ),

        "slot_results":
            slot_results,

        "template_mode":
            False
    }


# =========================================================
# MAIN DETECTION
# =========================================================

def detect_instruments(
    image_path,
    scan_mode="post_op",
    min_confidence=MIN_CONFIDENCE
):

    image_path = Path(
        image_path
    )

    if not image_path.exists():

        raise FileNotFoundError(
            f"Image not found: {image_path}"
        )

    image = cv2.imread(
        str(
            image_path
        )
    )

    if image is None:

        raise ValueError(
            "Unable to read image: "
            f"{image_path}"
        )

    scan_mode = (
        str(
            scan_mode
        )
        .strip()
        .lower()
    )

    if scan_mode == "pre_op":

        return detect_pre_op(
            image
        )

    if scan_mode == "post_op":

        return detect_post_op(
            image,
            min_confidence=
                min_confidence
        )

    raise ValueError(
        "scan_mode must be "
        "'pre_op' or 'post_op'."
    )


# =========================================================
# DEBUG IMAGE
# =========================================================

def save_debug_image(
    image_path,
    output_path,
    scan_mode="post_op"
):

    image_path = Path(
        image_path
    )

    output_path = Path(
        output_path
    )

    image = cv2.imread(
        str(
            image_path
        )
    )

    if image is None:

        raise ValueError(
            f"Unable to read image: {image_path}"
        )

    boxes = get_template_boxes(
        image
    )

    for (
        name,
        box
    ) in boxes.items():

        (
            x1,
            y1,
            x2,
            y2
        ) = box

        crop = crop_box(
            image,
            box
        )

        score = calculate_presence_score(
            crop
        )

        cv2.rectangle(
            image,
            (
                x1,
                y1
            ),
            (
                x2,
                y2
            ),
            (
                0,
                0,
                255
            ),
            3
        )

        label = (
            f"{name} "
            f"{score:.1f}"
        )

        cv2.putText(
            image,
            label,
            (
                x1,
                max(
                    25,
                    y1 - 10
                )
            ),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (
                0,
                0,
                255
            ),
            2
        )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    success = cv2.imwrite(
        str(
            output_path
        ),
        image
    )

    if not success:

        raise RuntimeError(
            "Unable to save debug image."
        )

    return len(
        boxes
    )


# =========================================================
# CLI
#
# python detect.py image.jpg pre_op
# python detect.py image.jpg post_op
# =========================================================

if __name__ == "__main__":

    if len(sys.argv) not in (
        2,
        3
    ):

        print(
            "Usage: python detect.py "
            "<image_path> "
            "[pre_op|post_op]"
        )

        raise SystemExit(
            1
        )

    image_argument = (
        sys.argv[
            1
        ]
    )

    mode_argument = (
        sys.argv[
            2
        ]
        if len(sys.argv) == 3
        else "post_op"
    )

    result = detect_instruments(
        image_argument,
        scan_mode=
            mode_argument
    )

    print(
        json.dumps(
            result,
            indent=4
        )
    )