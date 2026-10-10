from pathlib import Path
import random
import shutil


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

SEED = 42

TARGET_CLASSES = [
    "Forceps",
    "Hemostat",
    "Mayo",
    "Scalpel",
    "Syringe",
]

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# prepare_dataset.py is inside:
# CNN_Service/ai/training/
AI_ROOT = Path(__file__).resolve().parent.parent

SOURCE_ROOT = (
    AI_ROOT
    / "SID-RAS-raw"
    / "SURGICAL TOOLS"
    / "SURGICAL TOOLS"
)

DESTINATION_ROOT = AI_ROOT / "dataset"


# ---------------------------------------------------------
# Split helpers
# ---------------------------------------------------------

def split_counts(total: int):
    """
    80% train
    10% validation
    remainder test

    For 640 images:
        train = 512
        val   = 64
        test  = 64
    """
    train_count = int(total * 0.80)
    val_count = int(total * 0.10)
    test_count = total - train_count - val_count

    return train_count, val_count, test_count


def get_images(folder: Path):
    """Return all supported image files in a folder."""
    return sorted(
        [
            file
            for file in folder.iterdir()
            if file.is_file()
            and file.suffix.lower() in IMAGE_EXTENSIONS
        ]
    )


# ---------------------------------------------------------
# Dataset directory preparation
# ---------------------------------------------------------

def remove_old_empty_detection_folders():
    """
    The repository previously contained:

        dataset/train/images
        dataset/train/labels
        dataset/val/images
        dataset/val/labels
        dataset/test/images
        dataset/test/labels

    Those belong to an object-detection layout.

    This CNN uses classification folders instead.

    Empty detection folders are removed safely.
    Non-empty folders are NEVER deleted automatically.
    """

    for split in ["train", "val", "test"]:
        for name in ["images", "labels"]:
            folder = DESTINATION_ROOT / split / name

            if not folder.exists():
                continue

            contents = list(folder.iterdir())

            if contents:
                raise RuntimeError(
                    f"\nCannot remove non-empty folder:\n{folder}\n\n"
                    "It contains files. Check it manually before continuing."
                )

            folder.rmdir()
            print(f"Removed empty placeholder: {folder}")


def prepare_output_directories():
    """Create classification folders for each split and class."""

    for split in ["train", "val", "test"]:
        for class_name in TARGET_CLASSES:
            destination = DESTINATION_ROOT / split / class_name

            # Makes rerunning the script deterministic.
            if destination.exists():
                shutil.rmtree(destination)

            destination.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------
# Copy dataset
# ---------------------------------------------------------

def copy_images(files, destination: Path):
    for file in files:
        shutil.copy2(file, destination / file.name)


def prepare_dataset():
    print("=" * 65)
    print("SURGITRACK CNN DATASET PREPARATION")
    print("=" * 65)

    print(f"\nSource:")
    print(SOURCE_ROOT)

    print(f"\nDestination:")
    print(DESTINATION_ROOT)

    if not SOURCE_ROOT.exists():
        raise FileNotFoundError(
            f"\nSID-RAS source directory does not exist:\n{SOURCE_ROOT}"
        )

    # Make sure all five classes exist.
    for class_name in TARGET_CLASSES:
        class_folder = SOURCE_ROOT / class_name

        if not class_folder.exists():
            raise FileNotFoundError(
                f"Class folder not found: {class_folder}"
            )

    remove_old_empty_detection_folders()
    prepare_output_directories()

    rng = random.Random(SEED)

    grand_train = 0
    grand_val = 0
    grand_test = 0

    print("\nPreparing classes...\n")

    for class_name in TARGET_CLASSES:

        source_class = SOURCE_ROOT / class_name

        images = get_images(source_class)

        if not images:
            raise RuntimeError(
                f"No images found for class: {class_name}"
            )

        # Fixed seed makes the split reproducible.
        rng.shuffle(images)

        train_count, val_count, test_count = split_counts(len(images))

        train_files = images[:train_count]

        val_files = images[
            train_count:
            train_count + val_count
        ]

        test_files = images[
            train_count + val_count:
        ]

        # Extra safety check.
        if (
            len(train_files)
            + len(val_files)
            + len(test_files)
            != len(images)
        ):
            raise RuntimeError(
                f"Split error for class {class_name}"
            )

        train_destination = (
            DESTINATION_ROOT / "train" / class_name
        )

        val_destination = (
            DESTINATION_ROOT / "val" / class_name
        )

        test_destination = (
            DESTINATION_ROOT / "test" / class_name
        )

        copy_images(train_files, train_destination)
        copy_images(val_files, val_destination)
        copy_images(test_files, test_destination)

        grand_train += len(train_files)
        grand_val += len(val_files)
        grand_test += len(test_files)

        print(
            f"{class_name:<12} "
            f"Total={len(images):<4} "
            f"Train={len(train_files):<4} "
            f"Val={len(val_files):<4} "
            f"Test={len(test_files):<4}"
        )

    total = grand_train + grand_val + grand_test

    print("\n" + "=" * 65)
    print("DATASET PREPARATION COMPLETE")
    print("=" * 65)

    print(f"Training images   : {grand_train}")
    print(f"Validation images : {grand_val}")
    print(f"Testing images    : {grand_test}")
    print(f"Total images      : {total}")

    print("\nClasses:")

    for class_name in TARGET_CLASSES:
        print(f"  - {class_name}")

    print("\nFinal structure:")
    print(
        """
dataset/
├── train/
│   ├── Forceps/
│   ├── Hemostat/
│   ├── Mayo/
│   ├── Scalpel/
│   └── Syringe/
├── val/
│   ├── Forceps/
│   ├── Hemostat/
│   ├── Mayo/
│   ├── Scalpel/
│   └── Syringe/
└── test/
    ├── Forceps/
    ├── Hemostat/
    ├── Mayo/
    ├── Scalpel/
    └── Syringe/
"""
    )


if __name__ == "__main__":
    prepare_dataset()