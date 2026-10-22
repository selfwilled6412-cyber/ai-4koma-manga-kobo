(() => {
  'use strict';

  const STORE = 'ai4koma.studio.v1';
  const WIZARD = 'ai4koma.wizard.v1';
  const $ = id => document.getElementById(id);
  const canvas = $('comic');
  const ctx = canvas.getContext('2d');
  const newPanel = () => ({ scene: '', speech: '', image: '', zoom: 100, x: 0, y: 0 });
  const fresh = () => ({ version: 1, title: 'わたしの4コマ漫画', hero: '', layout: 'vertical', panels: Array.from({ length: 4 }, newPanel) });
  let project = fresh();
  let selected = 0;
  let saveTimer = 0;
  let renderPending = false;
  const imageCache = new Map();

  const fields = {
    title: $('title'), hero: $('hero'), layout: $('layout'),
    scene: $('scene'), speech: $('speech'), zoom: $('zoom'),
    x: $('offsetX'), y: $('offsetY')
  };

  function status(message, target = 'status') {
    $(target).textContent = message;
  }

  function bounded(n, minimum, maximum, fallback) {
    n = Number(n);
    return Number.isFinite(n) ? Math.min(maximum, Math.max(minimum, n)) : fallback;
  }

  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.panels) || raw.panels.length !== 4) throw Error('4コマの編集データではありません。');
    const result = fresh();
    result.title = String(raw.title || '').slice(0, 45);
    result.hero = String(raw.hero || '').slice(0, 120);
    result.layout = raw.layout === 'grid' ? 'grid' : 'vertical';
    result.panels = raw.panels.map(panel => {
      panel = panel || {};
      return {
        scene: String(panel.scene || '').slice(0, 180),
        speech: String(panel.speech || '').slice(0, 90),
        image: typeof panel.image === 'string' && /^data:image\/(png|jpeg|webp);base64,/i.test(panel.image) ? panel.image : '',
        zoom: bounded(panel.zoom, 100, 260, 100),
        x: bounded(panel.x, -100, 100, 0),
        y: bounded(panel.y, -100, 100, 0)
      };
    });
    return result;
  }

  function loadInitial() {
    try {
      const wizard = sessionStorage.getItem(WIZARD);
      if (wizard) {
        sessionStorage.removeItem(WIZARD);
        const answers = JSON.parse(wizard);
        if (Array.isArray(answers) && answers.length === 5) {
          const p = fresh();
          p.hero = String(answers[0]).slice(0, 120);
          p.title = 'わたしの4コマ漫画';
          for (let i = 0; i < 4; i++) p.panels[i].scene = String(answers[i + 1]).slice(0, 180);
          project = p;
          status('質問の内容を4コマに引き継ぎました！');
          return;
        }
      }
    } catch (e) { /* invalid session draft */ }
    try {
      const saved = localStorage.getItem(STORE);
      if (saved) {
        project = normalize(JSON.parse(saved));
        status('この端末に残っていた編集内容を読み込みました。');
      }
    } catch (e) { status('一時保存の読み込みができませんでした。'); }
  }

  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify(project));
      } catch (e) {
        try {
          const withoutImages = { ...project, panels: project.panels.map(p => ({ ...p, image: '' })) };
          localStorage.setItem(STORE, JSON.stringify(withoutImages));
          status('画像の容量が大きいため、自動保存は文字のみです。画像を含めて残すには「編集データを保存」を押してください。');
        } catch (_) {
          status('ブラウザの保存容量を超えました。編集データをファイルに保存してください。');
        }
      }
    }, 450);
  }

  function schedule() {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(() => {
      renderPending = false;
      draw();
    });
  }

  function updateProjectInputs() {
    fields.title.value = project.title;
    fields.hero.value = project.hero;
    fields.layout.value = project.layout;
    updatePanelInputs();
    schedule();
  }

  function updatePanelInputs() {
    const p = project.panels[selected];
    fields.scene.value = p.scene;
    fields.speech.value = p.speech;
    fields.zoom.value = p.zoom;
    fields.x.value = p.x;
    fields.y.value = p.y;
    $('zoomValue').textContent = p.zoom + '%';
    $('xValue').textContent = p.x === 0 ? '中央' : p.x + '%';
    $('yValue').textContent = p.y === 0 ? '中央' : p.y + '%';
    document.querySelectorAll('.tab').forEach(tab => {
      const active = Number(tab.dataset.panel) === selected;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    $('panelImage').value = '';
  }

  function setPanelImage(src) {
    const p = project.panels[selected];
    p.image = src;
    imageCache.delete(selected);
    persist();
    schedule();
  }

  function rounded(x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.closePath();
  }

  function fitLines(text, maxWidth, maxRows) {
    const rows = [];
    let line = '';
    for (const letter of Array.from(String(text || '').replace(/\r/g, ''))) {
      if (letter === '\n') {
        rows.push(line);
        line = '';
      } else if (ctx.measureText(line + letter).width > maxWidth && line) {
        rows.push(line);
        line = letter;
      } else {
        line += letter;
      }
      if (rows.length >= maxRows) break;
    }
    if (rows.length < maxRows && line) rows.push(line);
    if (rows.length > maxRows) rows.length = maxRows;
    const source = String(text || '').replace(/\r/g, '');
    if (rows.join('').length < source.replace(/\n/g, '').length && rows.length) {
      let last = rows.length - 1;
      while (ctx.measureText(rows[last] + '…').width > maxWidth && rows[last].length) rows[last] = rows[last].slice(0, -1);
      rows[last] += '…';
    }
    return rows;
  }

  function imageFor(index, src) {
    if (!src) return null;
    let cached = imageCache.get(index);
    if (cached && cached.src === src) return cached.ready ? cached.image : null;
    const image = new Image();
    cached = { src, image, ready: false };
    imageCache.set(index, cached);
    image.onload = () => {
      if (imageCache.get(index) === cached) {
        cached.ready = true;
        schedule();
      }
    };
    image.onerror = () => {
      if (imageCache.get(index) === cached) status('画像を読み込めませんでした。別のPNG/JPG画像を選んでください。');
    };
    image.src = src;
    return null;
  }

  function drawBackground(index, x, y, w, h, description) {
    const themes = [
      ['#ffedaa', '#f8b0b9', '#e78288'],
      ['#afe7f5', '#6594df', '#4e68a9'],
      ['#dac1fa', '#aa7ad7', '#724aaf'],
      ['#bdf3d3', '#70b89f', '#448d7e']
    ];
    const t = themes[index];
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, t[0]);
    grad.addColorStop(1, t[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = t[2] + '4c';
    ctx.beginPath();
    ctx.arc(x + w * .72, y + h * .42, h * .52, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w * .25, y + h * 1.05, h * .7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#202e53';
    ctx.textAlign = 'center';
    ctx.font = '800 28px sans-serif';
    ctx.fillText('ここにイラストを追加', x + w * .50, y + h * .46);
    if (!description) {
      ctx.font = '22px sans-serif';
      ctx.fillText('左の編集欄で場面を入力してね', x + w * .5, y + h * .60);
    }
  }

  function drawPanel(index, x, y, w, h) {
    const p = project.panels[index];
    ctx.save();
    ctx.shadowColor = '#00000026';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 7;
    ctx.fillStyle = '#ffffff';
    rounded(x, y, w, h, 8);
    ctx.fill();
    ctx.restore();

    ctx.save();
    rounded(x, y, w, h, 6);
    ctx.clip();
    const img = imageFor(index, p.image);
    if (img && img.naturalWidth && img.naturalHeight) {
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * p.zoom / 100;
      const iw = img.naturalWidth * scale;
      const ih = img.naturalHeight * scale;
      const left = x - (iw - w) * ((p.x + 100) / 200);
      const top = y - (ih - h) * ((p.y + 100) / 200);
      ctx.drawImage(img, left, top, iw, ih);
    } else {
      drawBackground(index, x, y, w, h, p.scene);
    }

    if (p.speech.trim()) {
      const bubbleW = Math.min(w * .46, 415);
      const bubbleX = x + w - bubbleW - 24;
      const bubbleY = y + 19;
      const fontSize = w < 600 ? 26 : 30;
      ctx.font = '900 ' + fontSize + 'px "Yu Gothic",Meiryo,sans-serif';
      const lines = fitLines(p.speech, bubbleW - 52, 3);
      const bubbleH = Math.min(h * .50, Math.max(82, 36 + lines.length * (fontSize + 8)));
      ctx.fillStyle = '#ffffffef';
      ctx.strokeStyle = '#21253a';
      ctx.lineWidth = 4;
      rounded(bubbleX, bubbleY, bubbleW, bubbleH, 24);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bubbleX + bubbleW * .18, bubbleY + bubbleH - 1);
      ctx.lineTo(bubbleX + bubbleW * .28, bubbleY + bubbleH + 18);
      ctx.lineTo(bubbleX + bubbleW * .35, bubbleY + bubbleH - 1);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#141827';
      ctx.font = '900 ' + fontSize + 'px "Yu Gothic",Meiryo,sans-serif';
      lines.forEach((line, i) => ctx.fillText(line, bubbleX + 24, bubbleY + 35 + (fontSize + 8) * i));
    }

    if (p.scene.trim()) {
      const capH = Math.min(105, h * .28);
      ctx.fillStyle = '#111827df';
      ctx.fillRect(x, y + h - capH, w, capH);
      const size = w < 600 ? 25 : 30;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = '800 ' + size + 'px "Yu Gothic",Meiryo,sans-serif';
      const lines = fitLines(p.scene, w - 65, 2);
      lines.forEach((line, i) => ctx.fillText(line, x + 28, y + h - capH + 40 + (size + 6) * i));
    }

    ctx.fillStyle = '#ffeb73';
    ctx.strokeStyle = '#171b31';
    ctx.lineWidth = 3;
    rounded(x + 12, y + 12, 88, 48, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#161c30';
    ctx.font = '900 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((index + 1) + 'コマ', x + 56, y + 44);
    ctx.restore();
    ctx.strokeStyle = '#161827';
    ctx.lineWidth = 8;
    rounded(x, y, w, h, 7);
    ctx.stroke();
  }

  function draw() {
    if (!ctx) return;
    const grid = project.layout === 'grid';
    canvas.width = grid ? 1080 : 940;
    canvas.height = grid ? 1360 : 1560;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#fffaf1';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1b2847';
    ctx.fillRect(0, 0, W, 130);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.font = '900 ' + (grid ? 51 : 47) + 'px "Yu Gothic",Meiryo,sans-serif';
    fitLines(project.title || '無題の4コマ', W - 82, 1).forEach(line => ctx.fillText(line, 42, 67));
    ctx.font = '22px "Yu Gothic",Meiryo,sans-serif';
    const who = project.hero ? '主人公：' + project.hero : 'MY ORIGINAL 4-KOMA COMIC';
    fitLines(who, W - 88, 1).forEach(line => ctx.fillText(line, 44, 103));

    if (grid) {
      const gap = 15, side = 38, top = 155, bottom = 47;
      const w = (W - side * 2 - gap) / 2;
      const h = (H - top - bottom - gap) / 2;
      for (let i = 0; i < 4; i++) drawPanel(i, side + (i % 2) * (w + gap), top + Math.floor(i / 2) * (h + gap), w, h);
    } else {
      const side = 37, top = 153, gap = 13, bottom = 40;
      const w = W - side * 2;
      const h = (H - top - bottom - gap * 3) / 4;
      for (let i = 0; i < 4; i++) drawPanel(i, side, top + i * (h + gap), w, h);
    }
    ctx.fillStyle = '#596174';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AI 4コマ漫画工房 · COMIC STUDIO', W / 2, H - 13);
  }

  function downloadBlob(blob, name) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function safeName() {
    return (project.title || '4コマ漫画').replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 45) || '4コマ漫画';
  }

  function makePrompt() {
    const intro = [
      '以下の4コマ漫画を画像生成してください。',
      '主人公：' + (project.hero || '各コマ共通の主人公'),
      '4コマを1枚ずつ生成して、それぞれ個別に保存できるようにしてください。',
      '4コマすべてで主人公の外見、服装、色、年齢、体格を統一してください。',
      'セリフは正確な日本語で。画像に文字を入れるのが難しければ文字を入れずにイラストだけ生成してください（このアプリでふきだしを付けます）。',
      '縦長4コマ漫画として読みやすい明るい絵柄、自然な動き、場面ごとのわかりやすい構図を優先してください。',
      ''
    ];
    project.panels.forEach((p, i) => {
      intro.push((i + 1) + 'コマ目：' + (p.scene || '自由な展開') + (p.speech ? ' / セリフ：「' + p.speech + '」' : ''));
    });
    intro.push('', '各コマの絵が完成したら、それぞれ保存して4コマ漫画工房の編集画面にアップロードします。');
    return intro.join('\n');
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const temp = document.createElement('textarea');
      temp.value = text;
      temp.style.position = 'fixed';
      temp.style.top = '-10000px';
      document.body.appendChild(temp);
      temp.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* no fallback */ }
      temp.remove();
      return ok;
    }
  }

  function wire() {
    ['title', 'hero', 'layout'].forEach(key => {
      fields[key].addEventListener(key === 'layout' ? 'change' : 'input', () => {
        project[key] = fields[key].value;
        persist();
        schedule();
      });
    });
    ['scene', 'speech', 'zoom', 'x', 'y'].forEach(key => {
      fields[key].addEventListener('input', () => {
        project.panels[selected][key] = ['zoom', 'x', 'y'].includes(key) ? Number(fields[key].value) : fields[key].value;
        if (key === 'zoom' || key === 'x' || key === 'y') updateLabels();
        persist();
        schedule();
      });
    });
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
      selected = Number(tab.dataset.panel);
      updatePanelInputs();
      status((selected + 1) + 'コマ目を編集中');
    }));
    $('panelImage').addEventListener('change', event => {
      const file = event.target.files && event.target.files[0];
      const panelIndex = selected;
      if (!file) return;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
        status('PNG/JPG/WebPの8MB以下の画像を選んでください。'); return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return;
        project.panels[panelIndex].image = reader.result;
        imageCache.delete(panelIndex);
        persist(); schedule();
        status((panelIndex + 1) + 'コマ目に画像を追加しました！');
      };
      reader.onerror = () => status('画像を読み込めませんでした。');
      reader.readAsDataURL(file);
    });
    $('clearImage').addEventListener('click', () => {
      setPanelImage('');
      status((selected + 1) + 'コマ目の画像を削除しました。');
    });
    $('copyAI').addEventListener('click', async () => {
      const ok = await copyText(makePrompt());
      status(ok ? '指示文をコピーしました。ChatGPTに貼り付けて画像を作ってね。' : 'コピーできませんでした。ブラウザのコピー権限を確認してください。', 'aiStatus');
    });
    $('download').addEventListener('click', () => {
      draw();
      canvas.toBlob(blob => {
        if (!blob) { status('画像を書き出せませんでした。'); return; }
        downloadBlob(blob, safeName() + '.png');
        status('PNG画像を書き出しました！');
      }, 'image/png');
    });
    $('print').addEventListener('click', () => {
      draw();
      $('printImage').src = canvas.toDataURL('image/png');
      status('A4印刷画面を開きます。');
      requestAnimationFrame(() => setTimeout(() => window.print(), 120));
    });
    $('saveProject').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      downloadBlob(blob, safeName() + '-編集データ.json');
      status('編集データを保存しました。次回は「続きから開く」を使ってね。');
    });
    $('loadProject').addEventListener('change', event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) { status('JSONファイルが大きすぎます。'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const loaded = normalize(JSON.parse(reader.result));
          project = loaded;
          selected = 0;
          imageCache.clear();
          updateProjectInputs();
          persist();
          status('編集データを読み込みました！');
        } catch (e) { status('編集データを開けません：' + e.message); }
        event.target.value = '';
      };
      reader.onerror = () => status('ファイルを読み込めませんでした。');
      reader.readAsText(file, 'utf-8');
    });
    $('demo').addEventListener('click', () => {
      project = fresh();
      project.title = '白ねこのドタバタ郵便配達';
      project.hero = '長靴をはいた白い猫。小さな青い帽子と赤い郵便バッグ';
      ['自転車で楽しそうに郵便配達をしている', '木製の電柱にぶつかって郵便物が空へ飛ぶ', '華麗な宙返りで郵便物を全部キャッチする', 'ビー玉を踏んで着地に失敗！'].forEach((scene, i) => { project.panels[i].scene = scene; });
      ['今日も元気に出発！', 'わぁ〜っ！', 'ぜんぶ取ったニャ！', 'あれ〜!?'].forEach((speech, i) => { project.panels[i].speech = speech; });
      imageCache.clear();
      selected = 0;
      updateProjectInputs();
      persist();
      status('サンプルを読み込みました。画像を追加するとさらに完成度が上がるよ！');
    });
    $('reset').addEventListener('click', () => {
      if (!window.confirm('編集中の作品を最初から作り直しますか？保存していない画像は失われます。')) return;
      project = fresh();
      selected = 0;
      imageCache.clear();
      updateProjectInputs();
      persist();
      status('新しい4コマ漫画を作成できます。');
    });
  }

  function updateLabels() {
    const p = project.panels[selected];
    $('zoomValue').textContent = p.zoom + '%';
    $('xValue').textContent = p.x === 0 ? '中央' : p.x + '%';
    $('yValue').textContent = p.y === 0 ? '中央' : p.y + '%';
  }

  if (!ctx) {
    status('このブラウザは描画機能に対応していません。');
    return;
  }
  loadInitial();
  updateProjectInputs();
  wire();
})();