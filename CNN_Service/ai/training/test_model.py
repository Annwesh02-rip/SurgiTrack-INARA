import unittest
import torch

from ai.model import SurgicalInstrumentCNN


class TestSurgicalInstrumentCNN(unittest.TestCase):

    def test_output_shape(self):
        model = SurgicalInstrumentCNN(num_classes=5)

        # batch of 2 RGB images, 224x224
        x = torch.randn(2, 3, 224, 224)

        output = model(x)

        self.assertEqual(output.shape, (2, 5))

    def test_single_image_output(self):
        model = SurgicalInstrumentCNN(num_classes=5)

        x = torch.randn(1, 3, 224, 224)

        output = model(x)

        self.assertEqual(output.shape, (1, 5))


if __name__ == "__main__":
    unittest.main()