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
  }
};

document.getElementById('leadForm').addEventListener('submit', function(e) {
  e.preventDefault();
  document.getElementById('formSuccess').style.display = 'block';
  this.reset();
});

/* 1. Teachable Machine */
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
    } catch (e) { console.error("TM Error", e); }
  }
  loadModel();

  drop.addEventListener('click', () => file.click());
  file.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });

  async function handleFile(f) {
    preview.src = URL.createObjectURL(f); 
    preview.style.display = 'block';
    inner.style.display = 'none';
    placeholder.style.display = 'none'; 
    content.style.display = 'none';
    loading.style.display = 'block';

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

/* 2. YOLO (Через Python-сервер) */
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
  file.addEventListener('change', (e) => { if (e.target.files[0]) uploadImage(e.target.files[0]); });

  async function uploadImage(imageFile) {
    inner.style.display = 'none';
    placeholder.style.display = 'none';
    content.style.display = 'none';
    loading.style.display = 'block';
    loading.textContent = "Связь с Python-сервером...";

    preview.src = URL.createObjectURL(imageFile);
    preview.style.display = 'block';

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = async () => {
      const base64data = reader.result;
      const t0 = performance.now();

      try {
        //  ОТПРАВЛЯЕМ НА НАШ PYTHON-СЕРВЕР
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
        loading.textContent = "Ошибка: Python-сервер не запущен или недоступен.";
        loading.style.color = "#ef4444";
      }
    };
  }
})();