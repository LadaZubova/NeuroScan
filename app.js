from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import base64
import numpy as np
import os

# 1. СНАЧАЛА создаем приложение Flask
app = Flask(__name__)
CORS(app) 

# 2. Затем загружаем модель
print("Загрузка модели YOLO...")
model = YOLO('best.pt')
print("Модель успешно загружена!")

# 3. Создаем маршрут для главной страницы (чтобы Render не выдавал 404)
@app.route('/')
def home():
    return "NeuroScan YOLO Server is running!"

# 4. Создаем маршрут для анализа
@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        image_data = data['image'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        results = model(img)
        res_img = results[0].plot()
        
        _, buffer = cv2.imencode('.jpg', res_img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'success': True,
            'image': f'data:image/jpeg;base64,{img_base64}',
            'count': len(results[0].boxes)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# 5. Запуск сервера
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
