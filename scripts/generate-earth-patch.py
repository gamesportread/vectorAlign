import os
import urllib.request
import cv2
import numpy as np

def generate_earth_patch():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    source_img_path = os.path.join(base_dir, 'public', 'textures', 'earth_day_8192.jpg')
    out_img_path = os.path.join(base_dir, 'public', 'textures', 'earth_patch_4096.jpg')
    model_dir = os.path.join(base_dir, 'scripts', 'models')
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, 'FSRCNN_x4.pb')

    # Ensure model is available
    if not os.path.exists(model_path):
        print('Downloading FSRCNN_x4 super-resolution model...')
        url = 'https://raw.githubusercontent.com/Saafke/FSRCNN_Tensorflow/master/models/FSRCNN_x4.pb'
        urllib.request.urlretrieve(url, model_path)
        print('Downloaded model to', model_path)

    print('Reading base texture:', source_img_path)
    img = cv2.imread(source_img_path)
    if img is None:
        raise FileNotFoundError(f'Could not load {source_img_path}')

    h, w, _ = img.shape
    # Florida / North America / Caribbean visible horizon disc bounding box
    # U: [0.1733398, 0.37890625], V: [0.53051758, 0.78613281]
    x1, x2 = 1420, 3104
    y1, y2 = 876, 1923

    crop = img[y1:y2, x1:x2]
    print(f'Cropped visible region: {crop.shape[1]}x{crop.shape[0]} px')

    print('Applying AI super-resolution (FSRCNN x4)...')
    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    sr.readModel(model_path)
    sr.setModel('fsrcnn', 4)
    upscaled = sr.upsample(crop)
    print(f'AI upscaled shape: {upscaled.shape[1]}x{upscaled.shape[0]} px')

    # Fit into 4096 width preserving aspect ratio
    target_w = 4096
    target_h = int(round(upscaled.shape[0] * (target_w / upscaled.shape[1])))
    resized = cv2.resize(upscaled, (target_w, target_h), interpolation=cv2.INTER_AREA)

    # Edge enhancement for terrain coastlines and coral reefs
    gaussian = cv2.GaussianBlur(resized, (0, 0), 2.0)
    enhanced = cv2.addWeighted(resized, 1.30, gaussian, -0.30, 0)

    cv2.imwrite(out_img_path, enhanced, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
    file_size_mb = os.path.getsize(out_img_path) / (1024 * 1024)
    print(f'Successfully generated {out_img_path}: {target_w}x{target_h} ({file_size_mb:.2f} MB)')

if __name__ == '__main__':
    generate_earth_patch()
