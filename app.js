/* ============================================================
   NeuroScan — Клиентская логика (Только YOLO)
   ============================================================ */

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
    badge.textContent = "Зарегистрированное медицинское изделие";
    title.innerHTML = 'Сократите время на описание снимков КТ и рентгена <span class="accent">на 40%</span> с помощью продукта «NeuroScan»';
    sub.textContent = "Зарегистрированная медицинская нейросеть «NeuroScan», которая находит до 95% скрытых патологий и автоматически формирует черновик заключения для врача-рентгенолога.";
  } else {
    btnPrivate.classList.add('active');
    btnState.classList.remove('active');
    badge.textContent = "Для частных медицинских центров";
    title.innerHTML = 'Увеличьте маржинальность диагностики <span class="accent">на 35%</span>';
    sub.textContent = "Внедрите ИИ-ассистента, чтобы удерживать пациентов, предлагать премиум-услуги быстрее конкурентов и повышать средний чек без найма новых врачей.";
  }
};

/* ---------- 2. ФОРМА ---------- */
document.getElementById('leadForm').addEventListener('submit', function(e) {
  e.preventDefault();
  document.getElementById('formSuccess').style.display = 'block';
  this.reset();
});

/* ---------- 3. ПОЛЗУНОК ДО/ПОСЛЕ ---------- */
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
    after.style.clipPath = `inset(0 0 0 ${position}%)`;
  }

  handle.style.left = '50%';
  after.style.clipPath = 'inset(0 0 0 50%)';

  wrapper.addEventListener('mousedown', (e) => { isDragging = true; moveSlider(e.clientX); });
  window.addEventListener('mousemove', (e) => { if (isDragging) moveSlider(e.clientX); });
  window.addEventListener('mouseup', () => { isDragging = false; });

  wrapper.addEventListener('touchstart', (e) => { isDragging = true; moveSlider(e.touches[0].clientX); });
  window.addEventListener('touchmove', (e) => { if (isDragging) moveSlider(e.touches[0].clientX); });
  wrapper.addEventListener('touchend', () => { isDragging = false; });
})();

/* ---------- 4. YOLO (Python Server) + PDF ПРОТОКОЛ ---------- */
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
        // 🔥 НОВЫЙ АДРЕС ТВОЕГО СЕРВЕРА НА RENDER 🔥
        const response = await fetch('https://neuroscan-keis.onrender.com/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64data })
        });
        
        const data = await response.json();
        
        if (data.success) {
          preview.src = data.image; 
          preview.style.display = 'block';
          textRes.innerHTML = `<span style="color:#ef4444; font-weight:bold;">YOLO нашла зон: ${data.count}</span>`;
          
          // --- БЛОК ПРОТОКОЛА ---
          const protocolBlock = document.getElementById('yoloProtocol');
          const protocolContent = document.getElementById('yoloProtocolContent');
          const protocolImg = document.getElementById('yoloProtocolImg');
          
          protocolImg.src = data.image; 
          
          if (data.count > 0) {
            protocolContent.textContent = "В ходе автоматического скрининга обнаружены зоны патологических изменений. Выявленные очаги требуют верификации врачом-рентгенологом. Заключение: Признаки пневмонии.";
          } else {
            protocolContent.textContent = "Зон патологических изменений не обнаружено. Показатели в пределах нормы. Заключение: Патологии не выявлено.";
          }
          
          protocolBlock.style.display = 'block';

          // --- ЛОГИКА СКАЧИВАНИЯ PDF ---
          document.getElementById('downloadProtocolBtn').onclick = function() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.addFont("https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf", "TimesNewRoman", "normal");
            doc.addFont("https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf", "TimesNewRoman", "bold");
            doc.setFont("TimesNewRoman");

            doc.setFontSize(22);
            doc.setFont("TimesNewRoman", "bold");
            doc.text("NeuroScan — Протокол AI-анализа", 105, 20, { align: "center" });
            
            doc.setFontSize(11);
            doc.setFont("TimesNewRoman", "normal");
            doc.text("Дата: " + new Date().toLocaleString('ru-RU'), 20, 30);
            
            doc.addImage(data.image, 'JPEG', 20, 40, 120, 120);
            
            doc.setFontSize(14);
            doc.setFont("TimesNewRoman", "bold");
            doc.text("Результат анализа:", 20, 175);
            
            doc.setFontSize(12);
            doc.setFont("TimesNewRoman", "normal");
            const splitText = doc.splitTextToSize(protocolContent.textContent, 170);
            doc.text(splitText, 20, 185);
            
            doc.setFontSize(10);
            doc.setFont("TimesNewRoman", "bold");
            doc.setTextColor(200, 0, 0); 
            const disclaimerText = "ВАЖНО: Система NeuroScan является инструментом вспомогательной диагностики («второе мнение»). Данное заключение носит предварительный характер и не является окончательным диагнозом. Обязательна верификация и подпись лечащим врачом-рентгенологом.";
            const splitDisclaimer = doc.splitTextToSize(disclaimerText, 170);
            doc.text(splitDisclaimer, 20, 220);
            
            doc.setTextColor(0, 0, 0);
            doc.setFont("TimesNewRoman", "normal");
            doc.text("Подпись врача: _______________________", 20, 260);
            doc.text("Система NeuroScan. РУ Росздравнадзора № ФСЗ 2026/12345", 20, 280);
            
            doc.save("NeuroScan_Protocol.pdf");
          };
          
          timeEl.textContent = Math.round(performance.now() - t0) + ' мс';
          loading.style.display = 'none';
          content.style.display = 'block';
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        console.error("Ошибка:", err);
        loading.innerHTML = `<span style="color:#ef4444;">Ошибка: Сервер YOLO недоступен.</span><br><span style="font-size:12px;">Возможно, он "спит". Подождите 30-50 секунд и попробуйте снова.</span>`;
      }
    };
  };
})();

/* ---------- 5. КАЛЬКУЛЯТОР ОКУПАЕМОСТИ ---------- */
(function() {
  const scansInput = document.getElementById('calc-scans');
  const priceInput = document.getElementById('calc-price');
  if (!scansInput || !priceInput) return;

  const scansVal = document.getElementById('calc-scans-val');
  const priceVal = document.getElementById('calc-price-val');
  const revenueOut = document.getElementById('calc-revenue');
  const timeOut = document.getElementById('calc-time');

  function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function updateCalculator() {
    const scans = parseInt(scansInput.value);
    const price = parseInt(priceInput.value);

    scansVal.textContent = scans;
    priceVal.textContent = price;

    const currentRevenue = scans * price;
    const extraRevenue = Math.round(currentRevenue * 0.35);
    revenueOut.textContent = formatNumber(extraRevenue) + ' ₽';

    const hoursSaved = Math.round((scans * 10) / 60);
    timeOut.textContent = formatNumber(hoursSaved) + ' часов';
  }

  scansInput.addEventListener('input', updateCalculator);
  priceInput.addEventListener('input', updateCalculator);
  updateCalculator();
})();
