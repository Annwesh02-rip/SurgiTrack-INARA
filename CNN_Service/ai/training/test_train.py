import unittest

from train import get_transforms, build_dataloaders


class TestTrainingPipeline(unittest.TestCase):

    def test_transforms_exist(self):
        train_transform, val_transform = get_transforms()

        self.assertIsNotNone(train_transform)
        self.assertIsNotNone(val_transform)

    def test_dataloaders_have_five_classes(self):
        train_loader, val_loader, class_names = build_dataloaders()

        self.assertEqual(
            class_names,
            ["Forceps", "Hemostat", "Mayo", "Scalpel", "Syringe"]
        )

        self.assertEqual(len(train_loader.dataset), 2560)
        self.assertEqual(len(val_loader.dataset), 320)


if __name__ == "__main__":
    unittest.main()