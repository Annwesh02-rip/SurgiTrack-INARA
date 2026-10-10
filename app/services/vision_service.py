from pathlib import Path
import json
import os
import subprocess
import sys


# =========================================================
# PATHS
# =========================================================

CURRENT_FILE = Path(
    __file__
).resolve()

PROJECT_ROOT = (
    CURRENT_FILE
    .parents[
        2
    ]
)

CNN_ROOT = (
    PROJECT_ROOT
    / "CNN_Service"
    / "ai"
)

DETECT_SCRIPT = (
    CNN_ROOT
    / "inference"
    / "detect.py"
)

MODEL_PATH = (
    CNN_ROOT
    / "model"
    / "surgitrack_cnn.pth"
)


# =========================================================
# VISION SERVICE
# =========================================================

class VisionService:

    def __init__(
        self
    ):

        self.model_loaded = False

        self.detectors = {}

        self.load_errors = {}

        self.load_model()

    # =====================================================
    # CHECK FILES
    # =====================================================

    def load_model(
        self
    ):

        self.model_loaded = False

        self.detectors = {}

        self.load_errors = {}

        if not DETECT_SCRIPT.exists():

            self.load_errors[
                "surgitrack_cnn"
            ] = (
                "detect.py not found: "
                f"{DETECT_SCRIPT}"
            )

            return False

        if not MODEL_PATH.exists():

            self.load_errors[
                "surgitrack_cnn"
            ] = (
                "CNN model not found: "
                f"{MODEL_PATH}"
            )

            return False

        self.detectors[
            "surgitrack_cnn"
        ] = str(
            DETECT_SCRIPT
        )

        self.model_loaded = True

        return True

    # =====================================================
    # JSON PARSER
    # =====================================================

    @staticmethod
    def _extract_json(
        output
    ):

        output = (
            output
            or ""
        ).strip()

        if not output:

            raise RuntimeError(
                "CNN returned no output."
            )

        try:

            return json.loads(
                output
            )

        except json.JSONDecodeError:
            pass

        start = output.find(
            "{"
        )

        end = output.rfind(
            "}"
        )

        if (
            start == -1
            or
            end == -1
            or
            end <= start
        ):

            raise RuntimeError(
                "CNN did not return valid JSON. "
                f"Output: {output}"
            )

        payload = output[
            start:end + 1
        ]

        try:

            return json.loads(
                payload
            )

        except json.JSONDecodeError as error:

            raise RuntimeError(
                "CNN returned malformed JSON. "
                f"Output: {output}"
            ) from error

    # =====================================================
    # INFER MODE
    # =====================================================

    @staticmethod
    def _infer_scan_mode(
        image_path,
        image_type=None
    ):

        if image_type in (
            "pre_op",
            "post_op"
        ):

            return image_type

        path_text = str(
            image_path
        ).lower()

        if "pre_op" in path_text:

            return "pre_op"

        return "post_op"

    # =====================================================
    # NORMALIZE
    # =====================================================

    @staticmethod
    def _normalize_result(
        result
    ):

        if not isinstance(
            result,
            dict
        ):

            raise RuntimeError(
                "CNN response is not an object."
            )

        normalized = dict(
            result
        )

        normalized[
            "detections"
        ] = (
            result.get(
                "detections",
                []
            )
            if isinstance(
                result.get(
                    "detections",
                    []
                ),
                list
            )
            else []
        )

        normalized[
            "counts"
        ] = (
            result.get(
                "counts",
                {}
            )
            if isinstance(
                result.get(
                    "counts",
                    {}
                ),
                dict
            )
            else {}
        )

        normalized[
            "total"
        ] = int(
            result.get(
                "total",
                len(
                    normalized[
                        "detections"
                    ]
                )
            )
        )

        normalized[
            "candidate_regions"
        ] = int(
            result.get(
                "candidate_regions",
                0
            )
        )

        normalized[
            "models_run"
        ] = 1

        normalized[
            "model_name"
        ] = (
            "surgitrack_cnn"
        )

        normalized[
            "execution_mode"
        ] = (
            "isolated_subprocess"
        )

        return normalized

    # =====================================================
    # DETECT
    # =====================================================

    def detect_instruments(
        self,
        image_path,
        image_type=None
    ):

        if not self.model_loaded:

            if not self.load_model():

                message = (
                    self.load_errors.get(
                        "surgitrack_cnn",
                        "CNN unavailable."
                    )
                )

                raise RuntimeError(
                    "surgitrack_cnn: "
                    f"{message}"
                )

        image_path = Path(
            image_path
        ).resolve()

        if not image_path.exists():

            raise FileNotFoundError(
                f"Image not found: {image_path}"
            )

        scan_mode = (
            self._infer_scan_mode(
                image_path,
                image_type
            )
        )

        # -------------------------------------------------
        # VERY IMPORTANT
        #
        # CNN runs as a completely separate Python process.
        #
        # Nothing from CNN_Service is imported into FastAPI.
        #
        # Therefore CNN code cannot register/re-register
        # SQLAlchemy's "users" table.
        # -------------------------------------------------

        child_environment = (
            os.environ.copy()
        )

        # Do not inherit a custom project PYTHONPATH.
        child_environment.pop(
            "PYTHONPATH",
            None
        )

        command = [
            sys.executable,
            str(
                DETECT_SCRIPT
            ),
            str(
                image_path
            ),
            scan_mode
        ]

        try:

            process = subprocess.run(
                command,
                cwd=str(
                    DETECT_SCRIPT.parent
                ),
                env=
                    child_environment,
                capture_output=True,
                text=True,
                timeout=120,
                check=False
            )

        except subprocess.TimeoutExpired as error:

            raise RuntimeError(
                "surgitrack_cnn: "
                "Inference timed out."
            ) from error

        except Exception as error:

            raise RuntimeError(
                "surgitrack_cnn: "
                "Unable to start CNN process: "
                f"{error}"
            ) from error

        if process.returncode != 0:

            stderr = (
                process.stderr
                or ""
            ).strip()

            stdout = (
                process.stdout
                or ""
            ).strip()

            message = (
                stderr
                or stdout
                or (
                    "CNN exited with code "
                    f"{process.returncode}"
                )
            )

            raise RuntimeError(
                "surgitrack_cnn: "
                f"{message}"
            )

        result = (
            self._extract_json(
                process.stdout
            )
        )

        return (
            self._normalize_result(
                result
            )
        )

    # =====================================================
    # STATUS
    # =====================================================

    def get_status(
        self
    ):

        return {
            "model_loaded":
                self.model_loaded,

            "detectors":
                list(
                    self.detectors.keys()
                ),

            "load_errors":
                self.load_errors,

            "execution_mode":
                "isolated_subprocess",

            "detect_script":
                str(
                    DETECT_SCRIPT
                ),

            "model_path":
                str(
                    MODEL_PATH
                )
        }


# =========================================================
# SINGLETON
# =========================================================

vision_service = (
    VisionService()
)