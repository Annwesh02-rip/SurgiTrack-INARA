import unittest

from prepare_dataset import split_counts, TARGET_CLASSES


class TestPrepareDataset(unittest.TestCase):
    def test_classes(self):
        self.assertEqual(
            TARGET_CLASSES,
            ["Forceps", "Hemostat", "Mayo", "Scalpel", "Syringe"]
        )

    def test_split_640(self):
        train, val, test = split_counts(640)

        self.assertEqual(train, 512)
        self.assertEqual(val, 64)
        self.assertEqual(test, 64)


if __name__ == "__main__":
    unittest.main()