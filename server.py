from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import base64
import numpy as np
import os

app = Flask(__name__)
CORS(app)

print("Загрузка модели...")
yolo_model = YOLO('best.pt')
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
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        # 1. YOLO (рамки)
        results = yolo_model(img_bgr)
        res_img = results[0].plot()
        _, buffer = cv2.imencode('.jpg', res_img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        # 2. "Тепловая карта" на основе рамок
        heatmap_img = img_bgr.copy()
        boxes = results[0].boxes
        
        if len(boxes) > 0:
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                # Рисуем градиентный круг внутри каждой рамки
                center_x = (x1 + x2) // 2
                center_y = (y1 + y2) // 2
                radius = max((x2 - x1) // 2, (y2 - y1) // 2)
                
                # Создаем слой для градиента
                overlay = heatmap_img.copy()
                cv2.circle(overlay, (center_x, center_y), radius, (0, 0, 255), -1)  # Красный
                cv2.circle(overlay, (center_x, center_y), int(radius * 0.6), (0, 165, 255), -1)  # Оранжевый
                cv2.circle(overlay, (center_x, center_y), int(radius * 0.3), (0, 255, 255), -1)  # Желтый
                
                # Смешиваем с оригиналом (прозрачность 50%)
                cv2.addWeighted(overlay, 0.5, heatmap_img, 0.5, 0, heatmap_img)

        _, heatmap_buffer = cv2.imencode('.jpg', heatmap_img)
        heatmap_base64 = base64.b64encode(heatmap_buffer).decode('utf-8')

        return jsonify({
            'success': True,
            'image': f'data:image/jpeg;base64,{img_base64}',
            'heatmap': f'data:image/jpeg;base64,{heatmap_base64}',
            'count': len(boxes)
        })
    except Exception as e:
        print("Ошибка:", e)
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
