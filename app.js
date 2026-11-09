/* ============================================================
   NeuroScan — Клиентская логика (Полная версия)
   ============================================================ */

// Глобальная переменная для хранения последней загруженной картинки
let globalUploadedFile = null;

/* ---------- 1. СЕГМЕНТАЦИЯ ТРАФИКА ---------- */
window.switchSegment = function(type) {
  const btnState = document.getElementById('btn-state');
  const btnPrivate = document.getElementById('btn-private');
  const badge = document.getElementById('hero-badge');
  const title = document.getElementById('hero-title');
  const sub = document.getElementById('hero-sub');

  if (type === 'state') {
    btnState.classList.add('active');
    btnPrivate.classList.remove('active');
    
    badge.textContent = "Для государственных учреждений";
    title.innerHTML = 'Сократите очереди на КТ и рентген <span class="accent">на 40%</span>';
    sub.textContent = "Зарегистрированная медицинская нейросеть «NeuroScan» разгружает врачей, ускоряет отчетность и помогает выполнять планы по ОМС без потери качества.";
  } else {
    btnPrivate.classList.add('active');
    btnState.classList.remove('active');
    
    badge.textContent = "Для частных медицинских центров";
    title.innerHTML = 'Увеличьте маржинальность диагностики <span class="accent">на 35%</span>';
    sub.textContent = "Внедрите ИИ-ассистента, чтобы удерживать пациентов, предлагать премиум-услуги быстрее конкурентов и повышать средний чек без найма новых врачей.";
  }
};

/* ---------- 2. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК AI (С автозапуском YOLO) ---------- */
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

    // Если картинка уже была загружена в TM, автоматически запускаем YOLO
    if (globalUploadedFile) {
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

      if (window.runYoloUpload) {
        window.runYoloUpload(globalUploadedFile);
      }
    }
  }
};

/* ---------- 3. ФОРМА ---------- */
document.getElementById('leadForm').addEventListener('submit', function(e) {
  e.preventDefault();
  document.getElementById('formSuccess').style.display = 'block';
  this.reset();
});

/* ---------- 4. ПОЛЗУНОК ДО/ПОСЛЕ ---------- */
(function() {
  const wrapper = document.getElementById('baWrapper');
  const after = document.getElementById('baAfter');
  const handle = document.getElementById('baHandle');

  if (!wrapper || !after || !handle) return;

  let isDragging = false;

  function moveSlider(x) {
    const rect = wrapper.getBoundingClientRect();
    let position = ((x - rect.left) / rect.width) * 100;
    if (position < 0) position = 0;
    if (position > 100) position = 100;
    handle.style.left = `${position}%`;
    after.style.clipPath = `inset(0 ${100 - position}% 0 0)`;
  }

  wrapper.addEventListener('mousedown', (e) => { isDragging = true; moveSlider(e.clientX); });
  window.addEventListener('mousemove', (e) => { if (isDragging) moveSlider(e.clientX); });
  window.addEventListener('mouseup', () => { isDragging = false; });

  wrapper.addEventListener('touchstart', (e) => { isDragging = true; moveSlider(e.touches[0].clientX); });
  window.addEventListener('touchmove', (e) => { if (isDragging) moveSlider(e.touches[0].clientX); });
  window.addEventListener('touchend', () => { isDragging = false; });
})();

/* ---------- 5. TEACHABLE MACHINE ---------- */
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

/* ---------- 6. YOLO (Python Server) ---------- */
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
      globalUploadedFile = e.target.files[0];
      window.runYoloUpload(e.target.files[0]); 
    }
  });

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
