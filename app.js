window.switchSegment = function(type) {
  const btnState = document.getElementById('btn-state');
  const btnPrivate = document.getElementById('btn-private');
  const mobBtnState = document.getElementById('mob-btn-state');
  const mobBtnPrivate = document.getElementById('mob-btn-private');
  const badge = document.getElementById('hero-badge');
  const title = document.getElementById('hero-title');
  const sub = document.getElementById('hero-sub');

  // Обновляем тексты
  if (type === 'state') {
    if (badge) badge.textContent = "Зарегистрированное медицинское изделие";
    if (title) title.innerHTML = 'Сократите время на описание снимков КТ и рентгена <span class="accent">на 40%</span> с помощью продукта «NeuroScan»';
    if (sub) sub.textContent = "Зарегистрированная медицинская нейросеть «NeuroScan», которая находит до 95% скрытых патологий и автоматически формирует черновик заключения для врача-рентгенолога.";
  } else {
    if (badge) badge.textContent = "Для частных медицинских центров";
    if (title) title.innerHTML = 'Увеличьте маржинальность диагностики <span class="accent">на 35%</span>';
    if (sub) sub.textContent = "Внедрите ИИ-ассистента, чтобы удерживать пациентов, предлагать премиум-услуги быстрее конкурентов и повышать средний чек без найма новых врачей.";
  }

  // Обновляем десктопный переключатель (если он есть)
  if (btnState && btnPrivate) {
    if (type === 'state') {
      btnState.classList.add('active');
      btnPrivate.classList.remove('active');
    } else {
      btnPrivate.classList.add('active');
      btnState.classList.remove('active');
    }
  }

  // Обновляем мобильный переключатель (если он есть)
  if (mobBtnState && mobBtnPrivate) {
    if (type === 'state') {
      mobBtnState.classList.add('active');
      mobBtnPrivate.classList.remove('active');
    } else {
      mobBtnPrivate.classList.add('active');
      mobBtnState.classList.remove('active');
    }
  }
};

document.getElementById('leadForm').addEventListener('submit', function(e) {
  e.preventDefault();
  document.getElementById('formSuccess').style.display = 'block';
  this.reset();
});

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
  window.addEventListener('touchend', () => { isDragging = false; });
})();

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
    if (e.target.files[0]) window.runYoloUpload(e.target.files[0]); 
  });

  window.runYoloUpload = async function(imageFile) {
    inner.style.display = 'none';
    placeholder.style.display = 'none';
    content.style.display = 'none';
    loading.style.display = 'block';
    loading.textContent = "Анализ снимка...";

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
          textRes.innerHTML = `<span style="color:#ef4444; font-weight:bold;">Найдено зон: ${data.count}</span>`;
          
          const protocolBlock = document.getElementById('yoloProtocol');
          const protocolContent = document.getElementById('yoloProtocolContent');
          const protocolImg = document.getElementById('yoloProtocolImg');
          const heatmapImg = document.getElementById('yoloHeatmapImg');
          
          protocolImg.src = data.image; 
          
          const hasHeatmap = data.heatmap && data.heatmap.length > 100;
          if (hasHeatmap) {
            heatmapImg.src = data.heatmap;
            heatmapImg.style.display = 'block';
          } else {
            heatmapImg.style.display = 'none';
          }
          
          if (data.count > 0) {
            protocolContent.textContent = "В ходе автоматического скрининга обнаружены зоны патологических изменений. Выявленные очаги требуют верификации врачом-рентгенологом. Заключение: Признаки пневмонии.";
          } else {
            protocolContent.textContent = "Зон патологических изменений не обнаружено. Показатели в пределах нормы. Заключение: Патологии не выявлено.";
          }
          
          protocolBlock.style.display = 'block';

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
            
            if (hasHeatmap) {
              doc.addImage(data.image, 'JPEG', 20, 40, 80, 80);
              doc.addImage(data.heatmap, 'JPEG', 110, 40, 80, 80);
              doc.setFontSize(10);
              doc.text("Разметка зон", 45, 125, { align: "center" });
              doc.text("Тепловая карта", 150, 125, { align: "center" });
            } else {
              doc.addImage(data.image, 'JPEG', 60, 40, 90, 90);
              doc.setFontSize(10);
              doc.text("Разметка зон", 105, 135, { align: "center" });
            }
            
            doc.setFontSize(14);
            doc.setFont("TimesNewRoman", "bold");
            doc.text("Результат анализа:", 20, 155);
            
            doc.setFontSize(12);
            doc.setFont("TimesNewRoman", "normal");
            const splitText = doc.splitTextToSize(protocolContent.textContent, 170);
            doc.text(splitText, 20, 165);
            
            doc.setFontSize(10);
            doc.setFont("TimesNewRoman", "bold");
            doc.setTextColor(200, 0, 0); 
            const disclaimerText = "ВАЖНО: Система NeuroScan является инструментом вспомогательной диагностики («второе мнение»). Данное заключение носит предварительный характер и не является окончательным диагнозом. Обязательна верификация и подпись лечащим врачом-рентгенологом.";
            const splitDisclaimer = doc.splitTextToSize(disclaimerText, 170);
            doc.text(splitDisclaimer, 20, 200);
            
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
        loading.innerHTML = `<span style="color:#ef4444;">Ошибка: Сервер временно недоступен.</span><br><span style="font-size:12px;">Подождите 30 секунд и попробуйте снова.</span>`;
      }
    };
  };
})();

/* ---------- 7. КАЛЬКУЛЯТОР ОКУПАЕМОСТИ ---------- */
(function() {
  const scansInput = document.getElementById('calc-scans-input');
  const priceInput = document.getElementById('calc-price-input');
  if (!scansInput || !priceInput) return;

  const revenueOut = document.getElementById('calc-revenue');
  const timeOut = document.getElementById('calc-time');

  function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function updateCalculator() {
    const scans = parseInt(scansInput.value) || 0;
    const price = parseInt(priceInput.value) || 0;

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

(function() {
  const track = document.getElementById('carouselTrack');
  const btnPrev = document.getElementById('carouselPrev');
  const btnNext = document.getElementById('carouselNext');

  if (!track || !btnPrev || !btnNext) return;

  let autoScrollInterval;
  const SCROLL_DELAY = 60000;

  function getScrollAmount() {
    const card = track.querySelector('.case-card');
    return card ? card.offsetWidth + 24 : track.clientWidth;
  }

  function scrollNext() {
    const amount = getScrollAmount();
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }

  btnNext.addEventListener('click', () => {
    scrollNext();
    resetAutoScroll();
  });

  btnPrev.addEventListener('click', () => {
    track.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    resetAutoScroll();
  });

  function startAutoScroll() {
    autoScrollInterval = setInterval(scrollNext, SCROLL_DELAY);
  }

  function stopAutoScroll() {
    clearInterval(autoScrollInterval);
  }

  function resetAutoScroll() {
    stopAutoScroll();
    startAutoScroll();
  }

  track.addEventListener('mouseenter', stopAutoScroll);
  track.addEventListener('mouseleave', startAutoScroll);

  startAutoScroll();
})();

(function() {
  const trigger = document.getElementById('econAnimationTrigger');
  const cards = document.getElementById('econCards');

  if (!trigger || !cards) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        cards.classList.add('is-visible');
        observer.unobserve(trigger);
      }
    });
  }, {
    threshold: 0.2
  });

  observer.observe(trigger);
})();

(function() {
  const elementsToAnimate = document.querySelectorAll(
    '.glass-card, .section-title, .section-sub, .hero-text-block, .hero-image-block'
  );

  elementsToAnimate.forEach(el => {
    el.classList.add('reveal-item');
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-active');
      } else {
        entry.target.classList.remove('is-active');
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
  });

  elementsToAnimate.forEach(el => {
    observer.observe(el);
  });
})();

/* ---------- 10. МОБИЛЬНОЕ БОКОВОЕ МЕНЮ ---------- */
(function() {
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuClose = document.getElementById('mobileMenuClose');
  const overlay = document.getElementById('mobileMenuOverlay');

  // Если кнопки или меню нет на странице — ничего не делаем
  if (!menuToggle || !mobileMenu) return;

  // Функция открытия меню
  window.openMobileMenu = function() {
    mobileMenu.style.left = '0';
    if (overlay) overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  };

  // Функция закрытия меню
  window.closeMobileMenu = function() {
    mobileMenu.style.left = '-100%';
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  };

  // Вешаем события на кнопки
  menuToggle.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    window.openMobileMenu();
  });

  if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', function(e) {
      e.preventDefault();
      window.closeMobileMenu();
    });
  }

  if (overlay) {
    overlay.addEventListener('click', function(e) {
      e.preventDefault();
      window.closeMobileMenu();
    });
  }
})();
