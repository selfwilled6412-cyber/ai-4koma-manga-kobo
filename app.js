(() => {
  'use strict';

  const questions = [
    {
      title: '主人公は誰・何？',
      badge: '主人公を決めよう！',
      help: '人でも、動物でも、食べ物でも、何でもOK！',
      placeholder: '例：メイド服を着た、がたいのいいおじさん',
      choices: ['ねこ', 'ロボット', 'おじさん', '宇宙人', 'ラーメン'],
      random: ['メイド服を着た、がたいのいいおじさん', 'ランドセルを背負った巨大なねこ', 'いつも眠そうな銀色ロボット', '空を飛びたいラーメン', 'サングラスをかけた小さな宇宙人']
    },
    {
      title: '最初は何をしてる？',
      badge: 'スタートの場面！',
      help: 'ふつうの日常でも、最初から変でもOK！',
      placeholder: '例：娘の化粧を真剣に手伝っている',
      choices: ['ごはんを食べてる', '学校へ行く準備', '仕事中', 'ゲーム中', '昼寝してる'],
      random: ['娘の化粧を真剣に手伝っている', 'コンビニでおにぎりを選んでいる', '教室で一人だけラジオ体操をしている', '自動販売機に話しかけている', '巨大なプリンを運んでいる']
    },
    {
      title: '次に何が起きる？',
      badge: 'ちょっと動かそう！',
      help: '主人公が何かしたり、誰かが来たり。',
      placeholder: '例：娘の制服を見つけて、なぜか着てみる',
      choices: ['誰かが来る', '変身する', '何かを発見', '出かける', '失敗する'],
      random: ['娘の制服を見つけて、なぜか着てみる', '突然しゃべるカラスが現れる', '足元のマンホールがエレベーターになる', '持っていたパンが急に巨大化する', '間違えて全然違う場所へ向かう']
    },
    {
      title: 'さらに変なこと・びっくりすることは？',
      badge: 'ここで大事件！',
      help: '「なんで!?」となる展開を入れると漫画っぽくなるよ。',
      placeholder: '例：そのまま娘の学校へ行ってしまう',
      choices: ['巨大化する', '空を飛ぶ', '全員まねする', '場所が変わる', '正体がバレる'],
      random: ['そのまま娘の学校へ行ってしまう', 'まわりの人も全員同じ服になってしまう', '建物ごと宇宙へ飛び立つ', '急に100人の分身が現れる', '主人公だけ重力が逆になる']
    },
    {
      title: '最後どうなる？',
      badge: 'オチを決めよう！',
      help: '笑える、かわいい、意味不明…どんな終わりでもOK！',
      placeholder: '例：参観日の教室で父が席に座り、娘が保護者席から見ている',
      choices: ['みんな笑う', '何事もなく終わる', '逆に人気者', 'さらに大変', '謎のまま終わる'],
      random: ['参観日の教室で父が席に座り、娘が保護者席から見ている', '誰もツッコまず、そのまま普通に一日が終わる', 'なぜか主人公が町の人気者になる', '最後の最後でもっと巨大なものが現れる', '全員が「まあいいか」と納得して終わる']
    }
  ];

  const state = { step: -1, answers: ['', '', '', '', ''] };

  const el = {
    startScreen: document.querySelector('#startScreen'),
    questionScreen: document.querySelector('#questionScreen'),
    resultScreen: document.querySelector('#resultScreen'),
    stepDots: document.querySelector('#stepDots'),
    questionNumber: document.querySelector('#questionNumber'),
    questionBadge: document.querySelector('#questionBadge'),
    questionTitle: document.querySelector('#questionTitle'),
    questionHelp: document.querySelector('#questionHelp'),
    answerInput: document.querySelector('#answerInput'),
    charCount: document.querySelector('#charCount'),
    choiceGrid: document.querySelector('#choiceGrid'),
    finalPrompt: document.querySelector('#finalPrompt'),
    previewStrip: document.querySelector('#previewStrip'),
    copyMessage: document.querySelector('#copyMessage'),
    floatingReset: document.querySelector('#floatingReset'),
    startBtn: document.querySelector('#startBtn'),
    nextBtn: document.querySelector('#nextBtn'),
    backBtn: document.querySelector('#backBtn'),
    randomBtn: document.querySelector('#randomBtn'),
    copyBtn: document.querySelector('#copyBtn'),
    editBtn: document.querySelector('#editBtn'),
    restartBtn: document.querySelector('#restartBtn')
  };

  function initDots() {
    el.stepDots.innerHTML = '';
    questions.forEach((_, index) => {
      const dot = document.createElement('span');
      dot.className = 'step-dot';
      dot.setAttribute('aria-label', `${index + 1}問目`);
      el.stepDots.appendChild(dot);
    });
    updateDots();
  }

  function showScreen(target) {
    [el.startScreen, el.questionScreen, el.resultScreen].forEach(screen => screen.classList.remove('active'));
    target.classList.add('active');
    el.floatingReset.hidden = target === el.startScreen;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateDots() {
    [...el.stepDots.children].forEach((dot, index) => {
      dot.classList.toggle('done', state.step > index || state.step === questions.length);
      dot.classList.toggle('current', state.step === index);
    });
  }

  function renderQuestion() {
    const q = questions[state.step];
    el.questionNumber.textContent = `Q${state.step + 1} / ${questions.length}`;
    el.questionBadge.textContent = q.badge;
    el.questionTitle.textContent = q.title;
    el.questionHelp.textContent = q.help;
    el.answerInput.placeholder = q.placeholder;
    el.answerInput.value = state.answers[state.step];
    updateCharCount();
    el.backBtn.textContent = state.step === 0 ? '← 最初へ戻る' : '← 戻る';
    el.nextBtn.textContent = state.step === questions.length - 1 ? '4コマ準備OK！ →' : 'これでOK！ 次へ →';

    el.choiceGrid.innerHTML = '';
    q.choices.forEach(choice => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice-btn';
      button.textContent = choice;
      if (state.answers[state.step] === choice) button.classList.add('selected');
      button.addEventListener('click', () => setAnswer(choice));
      el.choiceGrid.appendChild(button);
    });

    updateDots();
    showScreen(el.questionScreen);
    setTimeout(() => el.answerInput.focus(), 140);
  }

  function setAnswer(value) {
    state.answers[state.step] = value;
    el.answerInput.value = value;
    updateCharCount();
    [...el.choiceGrid.children].forEach(btn => btn.classList.toggle('selected', btn.textContent === value));
  }

  function updateCharCount() {
    el.charCount.textContent = el.answerInput.value.length;
  }

  function saveCurrentAnswer() {
    const value = el.answerInput.value.trim();
    if (!value) {
      el.answerInput.focus();
      el.answerInput.animate([
        { transform: 'translateX(0)' }, { transform: 'translateX(-9px)' },
        { transform: 'translateX(9px)' }, { transform: 'translateX(0)' }
      ], { duration: 240 });
      return false;
    }
    state.answers[state.step] = value;
    return true;
  }

  function detectTone() {
    const text = state.answers.join('');
    if (/かわい|猫|ねこ|犬|うさぎ|子ども|プリン|お菓子/.test(text)) return 'かわいく、楽しく、少しシュールなコミック調';
    if (/怖|幽霊|おばけ|怪物|ゾンビ/.test(text)) return '怖すぎず、コミカルで不思議な雰囲気';
    if (/宇宙|ロボット|未来|サイバー/.test(text)) return 'サイバー感とワクワク感のある、テンポの良いコミック調';
    return 'シュールで面白く、親しみやすいコミック調';
  }

  function buildPrompt() {
    const [hero, start, next, surprise, ending] = state.answers;
    const tone = detectTone();
    return `次の内容をもとに、日本語の4コマ漫画を1枚の画像として生成してください。\n\n【主人公】\n${hero}\n\n【4コマの内容】\n1コマ目：${start}\n2コマ目：${next}\n3コマ目：${surprise}\n4コマ目：${ending}\n\n【大事な指定】\n・4コマ漫画として、1コマ目〜4コマ目が一目で分かるように、はっきり区切ってください。\n・主人公「${hero}」の顔、髪型、服装、体格、色などの見た目は、全コマで同じ人物・同じキャラクターだと分かるように統一してください。\n・日本語の漫画にしてください。\n・セリフが合う場面では日本語の吹き出しを入れてください。\n・必要に応じて「ドン！」「えっ!?」「しーん…」などの日本語の効果音・漫画表現を入れてください。\n・文字はできるだけ読みやすく、4コマの順番が迷わない構成にしてください。\n・雰囲気は「${tone}」にしてください。\n・入力内容の面白さが伝わるよう、表情やポーズを大きめにして、漫画らしく演出してください。\n・余計な説明文やタイトルは増やしすぎず、4コマの内容を最優先してください。\n\nこの指定で4コマ漫画画像を生成してください。`;
  }

  function renderResult() {
    state.step = questions.length;
    updateDots();
    el.finalPrompt.value = buildPrompt();
    el.copyMessage.textContent = '';
    el.previewStrip.innerHTML = '';
    const labels = ['1コマ目', '2コマ目', '3コマ目', '4コマ目'];
    state.answers.slice(1).forEach((text, index) => {
      const panel = document.createElement('div');
      panel.className = 'preview-panel';
      const strong = document.createElement('strong');
      strong.textContent = labels[index];
      const span = document.createElement('span');
      span.textContent = text;
      panel.append(strong, span);
      el.previewStrip.appendChild(panel);
    });
    showScreen(el.resultScreen);
  }

  async function copyPrompt() {
    const text = el.finalPrompt.value;
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (_) {
      el.finalPrompt.focus();
      el.finalPrompt.select();
      copied = document.execCommand('copy');
      window.getSelection()?.removeAllRanges();
    }
    el.copyMessage.textContent = copied
      ? 'コピーできました！ChatGPTに貼り付けてね！'
      : 'コピーできない場合は、文章を選んで Ctrl + C でコピーしてね！';
  }

  function resetApp() {
    state.step = -1;
    state.answers = ['', '', '', '', ''];
    el.answerInput.value = '';
    el.copyMessage.textContent = '';
    updateDots();
    showScreen(el.startScreen);
  }

  el.startBtn.addEventListener('click', () => {
    state.step = 0;
    renderQuestion();
  });

  el.answerInput.addEventListener('input', () => {
    state.answers[state.step] = el.answerInput.value;
    updateCharCount();
    [...el.choiceGrid.children].forEach(btn => btn.classList.remove('selected'));
  });

  el.answerInput.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') el.nextBtn.click();
  });

  el.randomBtn.addEventListener('click', () => {
    const pool = questions[state.step].random;
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && next === state.answers[state.step]) {
      next = pool[(pool.indexOf(next) + 1) % pool.length];
    }
    setAnswer(next);
  });

  el.nextBtn.addEventListener('click', () => {
    if (!saveCurrentAnswer()) return;
    if (state.step < questions.length - 1) {
      state.step += 1;
      renderQuestion();
    } else {
      renderResult();
    }
  });

  el.backBtn.addEventListener('click', () => {
    saveCurrentAnswer();
    if (state.step === 0) resetApp();
    else {
      state.step -= 1;
      renderQuestion();
    }
  });

  el.copyBtn.addEventListener('click', copyPrompt);
  el.editBtn.addEventListener('click', () => {
    state.step = questions.length - 1;
    renderQuestion();
  });
  el.restartBtn.addEventListener('click', resetApp);
  el.floatingReset.addEventListener('click', resetApp);

  initDots();
  showScreen(el.startScreen);
})();
