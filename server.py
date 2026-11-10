from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import base64
import numpy as np

app = Flask(__name__)
CORS(app) # Разрешаем сайту отправлять запросы

# Загружаем обученную модель
print("Загрузка модели YOLO...")
model = YOLO('best.pt')
print("Модель успешно загружена!")

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        image_data = data['image'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        # Конвертируем в картинку
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        results = model(img) # YOLO делает предсказание
        res_img = results[0].plot() # Рисуем рамки (метод plot сам накладывает их на фото)
        
        # Кодируем обратно в base64 для сайта
        _, buffer = cv2.imencode('.jpg', res_img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'success': True,
            'image': f'data:image/jpeg;base64,{img_base64}',
            'count': len(results[0].boxes)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    # Запускаем сервер на 5000 порту
    app.run(host='127.0.0.1', port=5000)
