(function() {
  'use strict';

  const MAX_IMG = 720;
  const JPEG_QUALITY = 0.78;
  const TEXT_BG_COLORS = ['#FFFFFF', '#000000', '#FBEAF0', '#E6F1FB', '#EAF3DE', '#FAEEDA', 'transparent'];
  const TEXT_FG_COLORS = ['#111111', '#FFFFFF', '#D4537E', '#185FA5', '#3B6D11', '#854F0B'];

  const POSITION_FALLBACKS = {
    'tl': { textX: 4, textY: 4 },
    'tr': { textX: 52, textY: 4 },
    'bl': { textX: 4, textY: 82 },
    'br': { textX: 52, textY: 82 }
  };

  let state = null;
  let editing = { cardId: null, quadIdx: null };

  const container = document.getElementById('cards-container');
  const statusEl = document.getElementById('status');
  const toast = document.getElementById('toast');

  function uid() {
    return 'c' + Math.random().toString(36).slice(2, 9);
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 1600);
  }

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function defaultCover() {
    return {
      id: 'cover',
      type: 'cover',
      quads: [
        { title: '体制内牛马', pin: '北京' },
        { title: '无业游民', pin: '北京' },
        { title: '大厂女工', pin: '北京' },
        { title: '服装设计师', pin: '上海' }
      ]
    };
  }

  function defaultHour(time) {
    return {
      id: uid(),
      type: 'hour',
      time: time,
      quads: Array.from({ length: 4 }, () => ({
        img: null,
        text: '',
        textBg: '#FFFFFF',
        textFg: '#111111',
        textX: 4,
        textY: 4,
        fontSize: 11,
        imgZoom: 1,
        imgX: 0,
        imgY: 0
      }))
    };
  }

  function defaultState() {
    return {
      cards: [
        defaultCover(),
        defaultHour('08:00'),
        defaultHour('09:00')
      ]
    };
  }

  function fileToCompressedDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          const scale = Math.min(1, MAX_IMG / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function pickImage(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        showToast('正在处理图片…');
        const dataUrl = await fileToCompressedDataURL(file);
        callback(dataUrl);
      } catch (e) {
        showToast('图片处理失败');
      }
    };
    input.click();
  }

  async function loadFromStorage() {
    const data = await window.Storage.load();
    state = (data && Array.isArray(data.cards) && data.cards.length > 0) ? data : defaultState();
    if (!state.cards.find(c => c.type === 'cover')) {
      state.cards.unshift(defaultCover());
    }
    normalizeState();
    render();
    updateStatus('已载入');
  }

  function normalizeState() {
    state.cards.forEach(card => {
      if (!Array.isArray(card.quads)) card.quads = [];
      while (card.quads.length < 4) card.quads.push({});
      if (card.type !== 'hour') return;
      card.quads.forEach(q => {
        const fallback = POSITION_FALLBACKS[q.position] || POSITION_FALLBACKS.tl;
        if (typeof q.textX !== 'number') q.textX = fallback.textX;
        if (typeof q.textY !== 'number') q.textY = fallback.textY;
        if (typeof q.fontSize !== 'number') q.fontSize = 11;
        if (typeof q.imgZoom !== 'number') q.imgZoom = 1;
        if (typeof q.imgX !== 'number') q.imgX = 0;
        if (typeof q.imgY !== 'number') q.imgY = 0;
        if (!q.textBg) q.textBg = '#FFFFFF';
        if (!q.textFg) q.textFg = '#111111';
      });
    });
  }

  async function saveToStorage() {
    await window.Storage.save(state);
    updateStatus('已保存到本机');
  }

  function updateStatus(msg) {
    const t = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    statusEl.textContent = `${msg} · ${t}`;
  }

  function renderCardHTML(card) {
    let html = '<div class="tcard-grid">';
    for (let i = 0; i < 4; i++) {
      const q = card.quads[i];
      const borderRight = i % 2 === 0 ? (card.type === 'cover' ? '1px solid #111' : '1px solid white') : 'none';
      const borderBottom = i < 2 ? (card.type === 'cover' ? '1px solid #111' : '1px solid white') : 'none';

      if (card.type === 'cover') {
        html += `<div class="tcard-quad cover-quad" data-quad="${i}" style="border-right:${borderRight}; border-bottom:${borderBottom};">
          <div class="cover-label">${escapeHTML(q.title) || '<span style="color:rgba(0,0,0,0.25);">点击编辑</span>'}</div>
          ${q.pin ? `<div class="cover-pin"><span class="cover-pin-dot"></span> ${escapeHTML(q.pin)}</div>` : ''}
        </div>`;
      } else {
        const imgZoom = q.imgZoom || 1;
        const imgX = q.imgX || 0;
        const imgY = q.imgY || 0;
        const imgHTML = q.img
          ? `<img class="quad-img" src="${q.img}" alt="" loading="lazy" decoding="async" style="transform: translate(${imgX}%, ${imgY}%) scale(${imgZoom});">`
          : `<div class="tcard-quad-empty">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>点击上传</span>
            </div>`;

        let textHTML = '';
        if (q.text) {
          const isTransparent = q.textBg === 'transparent';
          const bgStyle = isTransparent ? '' : `background:${q.textBg};`;
          const textX = typeof q.textX === 'number' ? q.textX : 4;
          const textY = typeof q.textY === 'number' ? q.textY : 4;
          const fontSize = typeof q.fontSize === 'number' ? q.fontSize : 11;
          textHTML = `<div class="text-tag ${isTransparent ? 'transparent' : ''}" style="left:${textX}%; top:${textY}%; font-size:${fontSize}px; ${bgStyle} color:${q.textFg};">${escapeHTML(q.text)}</div>`;
        }
        html += `<div class="tcard-quad" data-quad="${i}" style="border-right:${borderRight}; border-bottom:${borderBottom};">${imgHTML}${textHTML}</div>`;
      }
    }
    html += '</div>';

    if (card.type === 'hour') {
      html += `<div class="time-badge">${escapeHTML(card.time)}</div>`;
    }
    return html;
  }

  function render() {
    container.innerHTML = '';
    state.cards.forEach((card) => {
      const wrap = document.createElement('div');
      wrap.className = 'card-wrap';

      const head = document.createElement('div');
      head.className = 'card-row';
      const isCover = card.type === 'cover';
      head.innerHTML = `
        <div class="meta">
          ${isCover
            ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
            : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
          }
          <span>${isCover ? '封面' : '时间卡 · ' + escapeHTML(card.time)}</span>
        </div>
        <div class="actions">
          <button class="icon-btn" data-act="export" data-id="${card.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            导出
          </button>
          ${isCover ? '' : `<button class="icon-btn" data-act="delete" data-id="${card.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
          </button>`}
        </div>
      `;
      wrap.appendChild(head);

      const cardEl = document.createElement('div');
      cardEl.className = 'tcard';
      cardEl.id = 'render-' + card.id;
      cardEl.innerHTML = renderCardHTML(card);
      wrap.appendChild(cardEl);
      attachDragHandlers(cardEl, card);

      if (editing.cardId === card.id) {
        wrap.appendChild(renderEditor(card));
      }

      cardEl.addEventListener('click', (e) => {
        const quad = e.target.closest('[data-quad]');
        const quadIdx = quad ? parseInt(quad.dataset.quad) : 0;
        editing = { cardId: card.id, quadIdx: quadIdx };
        render();
      });

      head.querySelectorAll('button[data-act]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (btn.dataset.act === 'export') exportCard(card.id);
          if (btn.dataset.act === 'delete') deleteCard(card.id);
        });
      });

      container.appendChild(wrap);
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function attachDragHandlers(cardEl, card) {
    if (card.type !== 'hour') return;

    cardEl.querySelectorAll('.text-tag').forEach(tag => {
      tag.addEventListener('pointerdown', (e) => {
        const quadEl = e.target.closest('[data-quad]');
        const quadIdx = parseInt(quadEl.dataset.quad);
        const q = card.quads[quadIdx];
        editing = { cardId: card.id, quadIdx };

        const quadRect = quadEl.getBoundingClientRect();
        const tagRect = tag.getBoundingClientRect();
        const offsetX = e.clientX - tagRect.left;
        const offsetY = e.clientY - tagRect.top;

        tag.setPointerCapture(e.pointerId);
        tag.classList.add('dragging');
        e.preventDefault();
        e.stopPropagation();

        const move = (ev) => {
          const maxX = Math.max(0, ((quadRect.width - tagRect.width) / quadRect.width) * 100);
          const maxY = Math.max(0, ((quadRect.height - tagRect.height) / quadRect.height) * 100);
          q.textX = clamp(((ev.clientX - quadRect.left - offsetX) / quadRect.width) * 100, 0, maxX);
          q.textY = clamp(((ev.clientY - quadRect.top - offsetY) / quadRect.height) * 100, 0, maxY);
          tag.style.left = q.textX + '%';
          tag.style.top = q.textY + '%';
        };

        const up = async (ev) => {
          tag.classList.remove('dragging');
          tag.releasePointerCapture(ev.pointerId);
          tag.removeEventListener('pointermove', move);
          tag.removeEventListener('pointerup', up);
          tag.removeEventListener('pointercancel', up);
          await saveToStorage();
          render();
        };

        tag.addEventListener('pointermove', move);
        tag.addEventListener('pointerup', up);
        tag.addEventListener('pointercancel', up);
      });
    });

    cardEl.querySelectorAll('.quad-img').forEach(img => {
      img.addEventListener('pointerdown', (e) => {
        const quadEl = e.target.closest('[data-quad]');
        const quadIdx = parseInt(quadEl.dataset.quad);
        if (editing.cardId !== card.id || editing.quadIdx !== quadIdx) return;
        const q = card.quads[quadIdx];
        const quadRect = quadEl.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startImgX = q.imgX || 0;
        const startImgY = q.imgY || 0;

        img.setPointerCapture(e.pointerId);
        img.classList.add('dragging');
        e.preventDefault();
        e.stopPropagation();

        const move = (ev) => {
          q.imgX = clamp(startImgX + ((ev.clientX - startX) / quadRect.width) * 100, -50, 50);
          q.imgY = clamp(startImgY + ((ev.clientY - startY) / quadRect.height) * 100, -50, 50);
          img.style.transform = `translate(${q.imgX}%, ${q.imgY}%) scale(${q.imgZoom || 1})`;
        };

        const up = async (ev) => {
          img.classList.remove('dragging');
          img.releasePointerCapture(ev.pointerId);
          img.removeEventListener('pointermove', move);
          img.removeEventListener('pointerup', up);
          img.removeEventListener('pointercancel', up);
          await saveToStorage();
          render();
        };

        img.addEventListener('pointermove', move);
        img.addEventListener('pointerup', up);
        img.addEventListener('pointercancel', up);
      });
    });
  }

  function renderEditor(card) {
    const ed = document.createElement('div');
    ed.className = 'editor';
    const qi = editing.quadIdx ?? 0;
    const q = card.quads[qi];

    let html = `
      <div class="editor-header">
        <div class="editor-title">${card.type === 'cover' ? '编辑封面' : '编辑时间卡'} · 第 ${qi + 1} 格</div>
        <button class="icon-btn" data-ed="close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="quad-picker">
        ${[0, 1, 2, 3].map(i => {
          const qq = card.quads[i];
          let preview = '';
          if (card.type === 'hour' && qq.img) {
            preview = `<img src="${qq.img}" alt="">`;
          } else if (card.type === 'cover') {
            preview = `<span style="font-size:10px; line-height:1.2;">${escapeHTML((qq.title || '').slice(0, 4))}</span>`;
          } else {
            preview = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>';
          }
          return `<button class="quad-pick-btn ${i === qi ? 'active' : ''}" data-pick="${i}">${preview}<span>第 ${i + 1} 格</span></button>`;
        }).join('')}
      </div>
    `;

    if (card.type === 'cover') {
      html += `
        <div class="editor-section">
          <div class="editor-section-title">职业 / 身份</div>
          <input type="text" data-field="title" value="${escapeHTML(q.title)}" placeholder="例如:体制内牛马">
        </div>
        <div class="editor-section">
          <div class="editor-section-title">坐标 / 城市</div>
          <input type="text" data-field="pin" value="${escapeHTML(q.pin)}" placeholder="例如:北京">
        </div>
      `;
    } else {
      html += `
        <div class="editor-section">
          <div class="editor-section-title">时间(中间显示)</div>
          <input type="text" data-field="time" value="${escapeHTML(card.time)}" placeholder="例如:08:00">
        </div>

        <div class="editor-section">
          <div class="editor-section-title">图片</div>
          <div class="row-buttons">
            <button class="btn" data-ed="pic">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              ${q.img ? '更换' : '上传'}
            </button>
            ${q.img ? `<button class="btn" data-ed="pic-clear">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
            </button>` : ''}
          </div>
          ${q.img ? `
            <div class="range-stack">
              <label>放大/缩小 <input type="range" data-field="imgZoom" min="1" max="3" step="0.05" value="${q.imgZoom || 1}"></label>
              <label>左右裁剪 <input type="range" data-field="imgX" min="-50" max="50" step="1" value="${q.imgX || 0}"></label>
              <label>上下裁剪 <input type="range" data-field="imgY" min="-50" max="50" step="1" value="${q.imgY || 0}"></label>
            </div>
            <div class="mini-hint">选中这一格后,也可以直接拖动图片调整裁剪。</div>
          ` : ''}
        </div>

        <div class="editor-section">
          <div class="editor-section-title">文字内容</div>
          <textarea data-field="text" rows="2" placeholder="例如:同事发现好玩的书">${escapeHTML(q.text)}</textarea>
        </div>

        <div class="editor-section">
          <div class="editor-section-title">文字大小</div>
          <div class="range-stack">
            <label><span>${q.fontSize || 11}px</span><input type="range" data-field="fontSize" min="8" max="28" step="1" value="${q.fontSize || 11}"></label>
          </div>
          <div class="mini-hint">文字可以直接在卡片上拖动。</div>
        </div>

        <div class="editor-section">
          <div class="editor-section-title">文字底色</div>
          <div class="swatches" data-swatch="bg">
            ${TEXT_BG_COLORS.map(c => `
              <button class="swatch ${c === 'transparent' ? 'transparent' : ''} ${q.textBg === c ? 'active' : ''}"
                      style="${c === 'transparent' ? '' : `background:${c};`}"
                      data-color="${c}"></button>
            `).join('')}
          </div>
        </div>

        <div class="editor-section">
          <div class="editor-section-title">文字颜色</div>
          <div class="swatches" data-swatch="fg">
            ${TEXT_FG_COLORS.map(c => `
              <button class="swatch ${q.textFg === c ? 'active' : ''}"
                      style="background:${c};"
                      data-color="${c}"></button>
            `).join('')}
          </div>
        </div>

      `;
    }

    html += `<button class="btn btn-primary" data-ed="save" style="width:100%; justify-content:center; margin-top:6px;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      保存
    </button>`;

    ed.innerHTML = html;

    ed.querySelector('[data-ed="close"]').onclick = () => {
      editing = { cardId: null, quadIdx: null };
      render();
    };

    ed.querySelectorAll('[data-pick]').forEach(b => {
      b.onclick = () => { editing.quadIdx = parseInt(b.dataset.pick); render(); };
    });

    ed.querySelectorAll('[data-field]').forEach(inp => {
      inp.oninput = (e) => {
        const field = inp.dataset.field;
        if (field === 'time') {
          card.time = e.target.value;
        } else if (['fontSize', 'imgZoom', 'imgX', 'imgY'].includes(field)) {
          card.quads[qi][field] = parseFloat(e.target.value);
          if (field === 'fontSize') {
            const span = inp.closest('label').querySelector('span');
            if (span) span.textContent = e.target.value + 'px';
          }
        } else {
          card.quads[qi][field] = e.target.value;
        }
        updateCardDOM(card);
      };
    });

    const picBtn = ed.querySelector('[data-ed="pic"]');
    if (picBtn) picBtn.onclick = () => pickImage(async (dataUrl) => {
      try {
        card.quads[qi].img = dataUrl;
        card.quads[qi].imgZoom = 1;
        card.quads[qi].imgX = 0;
        card.quads[qi].imgY = 0;
        render();
        showToast('图片已加入,记得保存');
      } catch (e) {
        console.error(e);
        showToast('图片处理失败');
      }
    });

    const picClear = ed.querySelector('[data-ed="pic-clear"]');
    if (picClear) picClear.onclick = () => {
      card.quads[qi].img = null;
      render();
    };

    ed.querySelectorAll('[data-swatch="bg"] .swatch').forEach(s => {
      s.onclick = () => { card.quads[qi].textBg = s.dataset.color; render(); };
    });
    ed.querySelectorAll('[data-swatch="fg"] .swatch').forEach(s => {
      s.onclick = () => { card.quads[qi].textFg = s.dataset.color; render(); };
    });
    ed.querySelector('[data-ed="save"]').onclick = async () => {
      await saveToStorage();
      editing = { cardId: null, quadIdx: null };
      render();
      showToast('已保存');
    };

    return ed;
  }

  function updateCardDOM(card) {
    const el = document.getElementById('render-' + card.id);
    if (el) {
      el.innerHTML = renderCardHTML(card);
      attachDragHandlers(el, card);
    }
  }

  async function exportCard(id) {
    const el = document.getElementById('render-' + id);
    if (!el) return;
    showToast('生成图片中…');
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#FFFFFF',
        scale: 2,
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      const card = state.cards.find(c => c.id === id);
      const name = card.type === 'cover' ? 'cover' : 'time-' + (card.time || 'card').replace(':', '');
      link.download = `${name}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('已导出到下载文件夹');
    } catch (e) {
      console.error(e);
      showToast('导出失败,请重试');
    }
  }

  async function deleteCard(id) {
    if (!confirm('删除这张时间卡片?')) return;
    state.cards = state.cards.filter(c => c.id !== id);
    editing = { cardId: null, quadIdx: null };
    render();
    await saveToStorage();
  }

  function nextHour(time) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(time);
    if (!m) return '10:00';
    const h = (parseInt(m[1]) + 1) % 24;
    return String(h).padStart(2, '0') + ':' + m[2];
  }

  document.getElementById('btn-add').onclick = async () => {
    const last = [...state.cards].reverse().find(c => c.type === 'hour');
    const time = last ? nextHour(last.time) : '08:00';
    state.cards.push(defaultHour(time));
    render();
    await saveToStorage();
    container.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  document.getElementById('btn-share').onclick = async () => {
    const link = await window.Storage.generateShareLink(state);
    try {
      await navigator.clipboard.writeText(link);
      showToast('分享链接已复制');
    } catch (e) {
      prompt('复制下面这个链接发给对方:', link);
    }
  };

  loadFromStorage();

})();
