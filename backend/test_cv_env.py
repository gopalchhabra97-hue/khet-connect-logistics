import cv2
import onnxruntime as ort
import numpy as np
from PIL import Image

print(f"OpenCV: {cv2.__version__}")
print(f"ONNXRuntime: {ort.__version__}")
print(f"Available Providers: {ort.get_available_providers()}")
print("Vision environment OK!")
