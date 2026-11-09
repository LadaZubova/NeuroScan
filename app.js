/* ============================================================
   NeuroScan — клиентская логика
   ============================================================ */

// Глобальная переменная для хранения последней загруженной картинки
let globalUploadedFile = null;

/* ---------- 1. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (С авто-запуском YOLO) ---------- */
window.switchTab = function (tab) {
  const btnTm = document.getElementById('btn-tm');
  const btnYolo = document.getElementById('btn-yolo');
  const tabTm = document.getElementById('tab-tm');
  const tabYolo = document.getElementById('tab-yolo');

  if (tab === 'tm') {
    btnTm.className = 'btn btn-pill btn-primary';
    btnYolo.className = 'btn btn-pill btn-glass';
    tabTm.style.display = 'block';
    tabYolo.style.display = 'none';
  } else {
    btnTm.className = 'btn btn-pill btn-glass';
    btnYolo.className = 'btn btn-pill btn-primary';
    tabTm.style.display = 'none';
    tabYolo.style.display = 'block';

    // 🔥 МАГИЯ АВТОЗАПУСКА: Если картинка уже была загружена, запускаем YOLO
    if (globalUploadedFile) {
      // Очищаем старое состояние YOLO
      const dropInner = document.getElementById('yoloDropInner');
      const placeholder = document.getElementById('yoloPlaceholder');
      const content = document.getElementById('yoloContent');
      const preview = document.getElementById('yoloPreview');
      
      if(dropInner) dropInner.style.display = 'none';
      if(placeholder) placeholder.style.display = 'none';
      if(content) content.style.display = 'none';
      if(preview) { 
        preview.src = URL.createObjectURL(globalUploadedFile); 
        preview.style.display = 'block'; 
      }

      // Вызываем функцию отправки на сервер (она определена ниже)
      if (window.runYoloUpload) {
        window.runYoloUpload(globalUploadedFile);
      }
    }
  }
};

/* ---------- 2. ОТПРАВКА ФОРМЫ ---------- */
(function () {
  const form = document.getElementById('leadForm');
  const success = document.getElementById('formSuccess');
  if (form && success) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      success.style.display = 'block';
      form.reset();
    });
  }
})();

/* ---------- 3. TEACHABLE MACHINE ---------- */
(function () {
  const drop = document.getElementById('aiDrop');
  const file = document.getElementById('aiFile');
  const preview = document.getElementById('aiPreview');
  const inner = document.getElementById('aiDropInner');
  const result = document.getElementById('aiResult');
  const loading = document.getElementById('aiLoading');
  
  if (!drop || !file) return;

  const placeholder = result.querySelector('.ai-result-placeholder');
  const content = result.querySelector('.ai-result-content');
  const classesEl = document.getElementById('aiClasses');
  const timeEl = document.getElementById('aiTime');
  let model = null;

  async function loadModel() {
    try {
      model = await tmImage.load("./model/model.json", "./model/metadata.json");
      console.log("Модель TM загружена!");
    } catch (e) { console.error("TM Error", e); }
  }
  loadModel();

  drop.addEventListener('click', () => file.click());
  file.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });

  async function handleFile(f) {
    // 🔥 СОХРАНЯЕМ ФАЙЛ ГЛОБАЛЬНО, ЧТОБЫ YOLO ЕГО УВИДЕЛ
    globalUploadedFile = f; 

    preview.src = URL.createObjectURL(f); 
    preview.style.display = 'block';
    inner.style.display = 'none';
    placeholder.style.display = 'none'; 
    content.style.display = 'none';
    loading.style.display = 'block';
    loading.textContent = 'Нейросеть анализирует снимок...';

    if (!model) return loading.textContent = "Модель грузится...";

    preview.onload = async () => {
      const t0 = performance.now();
      const predictions = await model.predict(preview);
      timeEl.textContent = Math.round(performance.now() - t0) + ' мс';
      predictions.sort((a, b) => b.probability - a.probability);
      
      classesEl.innerHTML = predictions.map((p) => {
        const isPneu = p.className.toLowerCase().includes('пневмон') || p.className.toLowerCase().includes('pneumonia');
        const color = isPneu ? '#ef4444' : '#4ade80';
        return `
          <div class="ai-class" style="margin-bottom:12px;">
            <div class="ai-class-name" style="color: ${color}; font-weight: bold;">${p.className}</div>
            <div class="ai-class-bar" style="height:8px; background:rgba(255,255,255,0.1); border-radius:4px;"><div class="ai-class-fill" style="width:${(p.probability * 100).toFixed(1)}%; background: ${color}; height:100%; border-radius:4px;"></div></div>
            <div class="ai-class-prob" style="color: ${color}; text-align:right; font-size:13px;">${(p.probability * 100).toFixed(1)}%</div>
          </div>`;
      }).join('');
      loading.style.display = 'none';
      content.style.display = 'block';
    };
  }
})();

/* ---------- 4. YOLO (Через Python-сервер) ---------- */
(function() {
  const drop = document.getElementById('yoloDrop');
  const file = document.getElementById('yoloFile');
  const preview = document.getElementById('yoloPreview');
  const inner = document.getElementById('yoloDropInner');
  const placeholder = document.getElementById('yoloPlaceholder');
  const content = document.getElementById('yoloContent');
  const textRes = document.getElementById('yoloText');
  const loading = document.getElementById('yoloLoading');
  const timeEl = document.getElementById('yoloTime');
  if (!drop || !file) return;

  drop.addEventListener('click', () => file.click());
  file.addEventListener('change', (e) => { 
    if (e.target.files[0]) {
      globalUploadedFile = e.target.files[0]; // Сохраняем, если загрузили тут
      window.runYoloUpload(e.target.files[0]); 
    }
  });

  // Экспортируем функцию наружу, чтобы switchTab мог её вызвать
  window.runYoloUpload = async function(imageFile) {
    inner.style.display = 'none';
    placeholder.style.display = 'none';
    content.style.display = 'none';
    loading.style.display = 'block';
    loading.textContent = "YOLO анализирует снимок...";

    preview.src = URL.createObjectURL(imageFile);
    preview.style.display = 'block';

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = async () => {
      const base64data = reader.result;
      const t0 = performance.now();

      try {
        const response = await fetch('http://127.0.0.1:5000/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64data })
        });
        
        const data = await response.json();
        
        if (data.success) {
          preview.src = data.image; 
          preview.style.display = 'block';
          textRes.innerHTML = `<span style="color:#ef4444; font-weight:bold;">YOLO нашла зон: ${data.count}</span>`;
          
          timeEl.textContent = Math.round(performance.now() - t0) + ' мс';
          loading.style.display = 'none';
          content.style.display = 'block';
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        loading.textContent = "Ошибка: Python-сервер не запущен.";
        loading.style.color = "#ef4444";
      }
    };
  };
})();
