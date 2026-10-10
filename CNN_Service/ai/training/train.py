from pathlib import Path
import json
import random

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

from ai.model import SurgicalInstrumentCNN


# =========================================================
# CONFIGURATION
# =========================================================

SEED = 42

IMAGE_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 5
LEARNING_RATE = 0.001

AI_ROOT = Path(__file__).resolve().parent.parent

TRAIN_DIR = AI_ROOT / "dataset" / "train"
VAL_DIR = AI_ROOT / "dataset" / "val"

MODEL_DIR = AI_ROOT / "model"

MODEL_PATH = MODEL_DIR / "surgitrack_cnn.pth"
LABELS_PATH = MODEL_DIR / "labels.json"

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# =========================================================
# RANDOM SEED
# =========================================================

def set_seed(seed=SEED):
    random.seed(seed)
    torch.manual_seed(seed)

    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


# =========================================================
# IMAGE TRANSFORMS
# =========================================================

def get_transforms():

    train_transform = transforms.Compose([
        transforms.Resize(
            (IMAGE_SIZE, IMAGE_SIZE)
        ),

        transforms.RandomHorizontalFlip(
            p=0.5
        ),

        transforms.RandomRotation(
            degrees=15
        ),

        transforms.ColorJitter(
            brightness=0.15,
            contrast=0.15,
            saturation=0.10
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
    ])

    val_transform = transforms.Compose([
        transforms.Resize(
            (IMAGE_SIZE, IMAGE_SIZE)
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
    ])

    return train_transform, val_transform


# =========================================================
# DATA LOADERS
# =========================================================

def build_dataloaders():

    if not TRAIN_DIR.exists():
        raise FileNotFoundError(
            f"Training directory not found:\n{TRAIN_DIR}"
        )

    if not VAL_DIR.exists():
        raise FileNotFoundError(
            f"Validation directory not found:\n{VAL_DIR}"
        )

    train_transform, val_transform = get_transforms()

    train_dataset = datasets.ImageFolder(
        root=TRAIN_DIR,
        transform=train_transform
    )

    val_dataset = datasets.ImageFolder(
        root=VAL_DIR,
        transform=val_transform
    )

    if train_dataset.classes != val_dataset.classes:
        raise RuntimeError(
            "Training and validation class names do not match."
        )

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,

        # Windows-friendly
        num_workers=0,

        pin_memory=torch.cuda.is_available()
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0,

        pin_memory=torch.cuda.is_available()
    )

    return (
        train_loader,
        val_loader,
        train_dataset.classes
    )


# =========================================================
# TRAIN ONE EPOCH
# =========================================================

def train_one_epoch(
    model,
    loader,
    criterion,
    optimizer
):

    model.train()

    running_loss = 0.0

    correct = 0
    total = 0

    for images, labels in loader:

        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        optimizer.zero_grad()

        outputs = model(images)

        loss = criterion(
            outputs,
            labels
        )

        loss.backward()

        optimizer.step()

        running_loss += (
            loss.item()
            * images.size(0)
        )

        predictions = torch.argmax(
            outputs,
            dim=1
        )

        correct += (
            predictions == labels
        ).sum().item()

        total += labels.size(0)

    epoch_loss = (
        running_loss / total
    )

    epoch_accuracy = (
        correct / total
    )

    return (
        epoch_loss,
        epoch_accuracy
    )


# =========================================================
# VALIDATION
# =========================================================

def validate(
    model,
    loader,
    criterion
):

    model.eval()

    running_loss = 0.0

    correct = 0
    total = 0

    with torch.no_grad():

        for images, labels in loader:

            images = images.to(DEVICE)
            labels = labels.to(DEVICE)

            outputs = model(images)

            loss = criterion(
                outputs,
                labels
            )

            running_loss += (
                loss.item()
                * images.size(0)
            )

            predictions = torch.argmax(
                outputs,
                dim=1
            )

            correct += (
                predictions == labels
            ).sum().item()

            total += labels.size(0)

    validation_loss = (
        running_loss / total
    )

    validation_accuracy = (
        correct / total
    )

    return (
        validation_loss,
        validation_accuracy
    )


# =========================================================
# SAVE MODEL
# =========================================================

def save_model(
    model,
    class_names,
    validation_accuracy,
    epoch
):

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    checkpoint = {
        "model_state_dict":
            model.state_dict(),

        "class_names":
            class_names,

        "image_size":
            IMAGE_SIZE,

        "validation_accuracy":
            validation_accuracy,

        "epoch":
            epoch
    }

    torch.save(
        checkpoint,
        MODEL_PATH
    )

    with open(
        LABELS_PATH,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            class_names,
            file,
            indent=4
        )


# =========================================================
# MAIN TRAINING
# =========================================================

def train_model():

    set_seed()

    print(
        "=" * 65
    )

    print(
        "SURGITRACK CNN TRAINING"
    )

    print(
        "=" * 65
    )

    print(
        f"\nDevice: {DEVICE}"
    )

    (
        train_loader,
        val_loader,
        class_names
    ) = build_dataloaders()

    print(
        f"Training images   : "
        f"{len(train_loader.dataset)}"
    )

    print(
        f"Validation images : "
        f"{len(val_loader.dataset)}"
    )

    print(
        f"Classes           : "
        f"{class_names}"
    )

    model = SurgicalInstrumentCNN(
        num_classes=len(class_names)
    )

    model = model.to(
        DEVICE
    )

    criterion = (
        nn.CrossEntropyLoss()
    )

    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=LEARNING_RATE
    )

    best_validation_accuracy = 0.0

    print(
        "\nStarting training...\n"
    )

    for epoch in range(
        1,
        EPOCHS + 1
    ):

        (
            train_loss,
            train_accuracy
        ) = train_one_epoch(
            model,
            train_loader,
            criterion,
            optimizer
        )

        (
            val_loss,
            val_accuracy
        ) = validate(
            model,
            val_loader,
            criterion
        )

        print(
            f"Epoch {epoch}/{EPOCHS}"
        )

        print(
            f"  Train Loss       : "
            f"{train_loss:.4f}"
        )

        print(
            f"  Train Accuracy   : "
            f"{train_accuracy * 100:.2f}%"
        )

        print(
            f"  Validation Loss  : "
            f"{val_loss:.4f}"
        )

        print(
            f"  Validation Acc.  : "
            f"{val_accuracy * 100:.2f}%"
        )

        if (
            val_accuracy
            > best_validation_accuracy
        ):

            best_validation_accuracy = (
                val_accuracy
            )

            save_model(
                model=model,
                class_names=class_names,
                validation_accuracy=val_accuracy,
                epoch=epoch
            )

            print(
                "  ✓ Best model saved"
            )

        print()

    print(
        "=" * 65
    )

    print(
        "TRAINING COMPLETE"
    )

    print(
        "=" * 65
    )

    print(
        f"Best validation accuracy: "
        f"{best_validation_accuracy * 100:.2f}%"
    )

    print(
        f"\nModel:\n{MODEL_PATH}"
    )

    print(
        f"\nLabels:\n{LABELS_PATH}"
    )


# =========================================================
# ENTRY POINT
# =========================================================

if __name__ == "__main__":
    train_model()