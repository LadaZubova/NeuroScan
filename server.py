from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import base64
import numpy as np
import os
import torch
import torchvision.models as models
import torchvision.transforms as transforms
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image
from PIL import Image

app = Flask(__name__)
CORS(app) # Разрешаем сайту отправлять запросы

print("Загрузка моделей...")
# 1. Загружаем YOLO
yolo_model = YOLO('best.pt')

# 2. Загружаем ResNet18 для Grad-CAM (облегченную версию)
resnet = models.resnet18(pretrained=False)
resnet.fc = torch.nn.Linear(resnet.fc.in_features, 2)
resnet.load_state_dict(torch.load('resnet_pneumonia.pth', map_location='cpu'))
resnet.half() # Переводим в float16
resnet.eval()
print("Модели успешно загружены!")

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
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        # 1. YOLO (рамки)
        results = yolo_model(img_bgr)
        res_img = results[0].plot()
        _, buffer = cv2.imencode('.jpg', res_img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        # 2. Grad-CAM (Настоящая тепловая карта)
        img_pil = Image.fromarray(img_rgb)
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        input_tensor = transform(img_pil).unsqueeze(0)
        input_tensor = input_tensor.half() # Переводим в float16 для совместимости
        input_tensor.requires_grad = True

        target_layers = [resnet.layer4[-1]]
        cam = GradCAM(model=resnet, target_layers=target_layers)
        
        targets = [ClassifierOutputTarget(0)] # Класс 0 - Пневмония
        
        grayscale_cam = cam(input_tensor=input_tensor, targets=targets)
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
    # Запускаем сервер локально на порту 5000
    app.run(host='127.0.0.1', port=5000)
