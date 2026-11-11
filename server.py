from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import base64
import numpy as np
import os
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image

app = Flask(__name__)
CORS(app)

print("Загрузка модели...")
model = YOLO('best.pt')
print("Модель загружена!")

@app.route('/')
def home():
    return "NeuroScan Server is running!"

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        image_data = data['image'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # 1. Предсказание с рамками
        results = model(img)
        res_img = results[0].plot()
        _, buffer = cv2.imencode('.jpg', res_img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        # 2. Тепловая карта
        # (В некоторых версиях YOLO последний слой называется иначе, 
        # если вылетит ошибка, попробуем model.model.model[-1])
        target_layers = [model.model.model[-2]] 
        cam = GradCAM(model=model, target_layers=target_layers)
        
        # 0 - это класс "пневмония" (первый класс в твоем датасете)
        targets = [ClassifierOutputTarget(0)] 
        grayscale_cam = cam(input_tensor=img, targets=targets)
        grayscale_cam = grayscale_cam[0, :]
        
        img_float = np.float32(img_rgb) / 255
        heatmap_img = show_cam_on_image(img_float, grayscale_cam, use_rgb=True)
        
        heatmap_bgr = cv2.cvtColor(heatmap_img, cv2.COLOR_RGB2BGR)
        _, heatmap_buffer = cv2.imencode('.jpg', heatmap_bgr)
        heatmap_base64 = base64.b64encode(heatmap_buffer).decode('utf-8')

        return jsonify({
            'success': True,
            'image': f'data:image/jpeg;base64,{img_base64}',
            'heatmap': f'data:image/jpeg;base64,{heatmap_base64}',
            'count': len(results[0].boxes)
        })
    except Exception as e:
        print("Ошибка:", e)
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
