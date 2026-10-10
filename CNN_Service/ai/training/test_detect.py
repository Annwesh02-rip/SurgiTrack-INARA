import unittest
import numpy as np
import cv2

from inference.detect import find_candidate_boxes


class TestMultipleDetection(unittest.TestCase):

    def test_finds_multiple_separate_objects(self):
        image = np.zeros((600, 800, 3), dtype=np.uint8)

        cv2.rectangle(image, (80, 100), (180, 450), (255, 255, 255), -1)
        cv2.rectangle(image, (300, 180), (520, 260), (255, 255, 255), -1)
        cv2.rectangle(image, (620, 80), (700, 400), (255, 255, 255), -1)

        boxes = find_candidate_boxes(image)

        self.assertGreaterEqual(len(boxes), 3)


if __name__ == "__main__":
    unittest.main()