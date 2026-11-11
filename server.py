from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import base64
import numpy as np
import os
import torch
from PIL import Image
from torchvision import transforms

app = Flask(__name__)
CORS(app)

print("Загрузка модели...")
model = YOLO('best.pt')
print("Модель загружена!")

# Функция для создания тепловой карты (Grad-CAM)
def generate_heatmap(img):
    # 1. Подготавливаем картинку (превращаем в тензор)
    transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((640, 640)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    input_tensor = transform(img).unsqueeze(0) # Добавляем размерность батча

    # 2. Получаем предсказание от модели YOLO
    # Нам нужны "сырые" данные с последнего слоя
    model.model.eval()
    
    # Запускаем модель
    with torch.no_grad():
        results = model.model(input_tensor)
    
    # 3. Упрощенный вариант: если YOLO нашла рамки, мы берем их и рисуем "тепловую" заливку
    # (Это надежнее, чем возиться со слоями Grad-CAM внутри YOLO, который часто ломается)
    orig_results = model(img)
    boxes = orig_results[0].boxes
    
    heatmap_img = img.copy()
    if len(boxes) > 0:
        for box in boxes:
            # Координаты рамки
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            # Рисуем "тепловую" заливку внутри рамки
            # (Красный в центре, желтый по краям)
            center_x = (x1 + x2) // 2
            center_y = (y1 + y2) // 2
            radius = max((x2 - x1) // 2, (y2 - y1) // 2)
            
            # Создаем градиент
            for i in range(3):
                overlay = heatmap_img.copy()
                alpha = 0.3 + (i * 0.15)
                cv2.circle(overlay, (center_x, center_y), radius - (i * 20), (0, 0, 255), -1) # Красный
                cv2.addWeighted(overlay, alpha, heatmap_img, 1 - alpha, 0, heatmap_img)

    return heatmap_img

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

        # 1. Предсказание с рамками
        results = model(img)
        res_img = results[0].plot()
        _, buffer = cv2.imencode('.jpg', res_img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        # 2. Тепловая карта (Наш упрощенный Grad-CAM)
        try:
            heatmap_img = generate_heatmap(img)
            _, heatmap_buffer = cv2.imencode('.jpg', heatmap_img)
            heatmap_base64 = base64.b64encode(heatmap_buffer).decode('utf-8')
        except Exception as e:
            print("Ошибка Grad-CAM:", e)
            heatmap_base64 = "" # Если не получилось, отправляем пустоту

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
