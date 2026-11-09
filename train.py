from ultralytics import YOLO

# ⚠️ СЮДА ВСТАВЬ СКОПИРОВАННЫЙ ПУТЬ
# Обязательно оставь букву r перед кавычками и сотри кавычки, которые скопировались автоматически (если они есть)
path_to_last = r'D:/олимпиады/ПрофГоризонт 2026/IT кейс/NeuroScan-YOLO/runs/detect/train/weights/last.pt'

model = YOLO(path_to_last)
model.train(resume=True)