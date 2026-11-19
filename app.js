(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function fmt(t) {
    if (!isFinite(t)) return '00:00';
    t = Math.max(0, Math.floor(t));
    var m = Math.floor(t / 60), s = t % 60;
    return (m < 10 ? '0' + m : '' + m) + ':' + (s < 10 ? '0' + s : '' + s);
  }

  var video = $('video2d');
  var fileInput = $('fileInput');
  var fileName = $('fileName');
  var playBtn = $('playBtn');
  var seek = $('seek');
  var curTime = $('curTime');
  var durTime = $('durTime');
  var volume = $('volume');
  var fsBtn = $('fsBtn');
  var fillBtn = $('fillBtn');
  var fillExitBtn = $('fillExitBtn');
  var fillExitBar = $('fillExitBar');
  var xrNote = $('xrNote');
  var xrBtn = $('xrBtn');
  var player = $('player');
  var dropHint = $('dropHint');
  var statusEl = $('status');
  var canvas = $('scene');
  var modeImmersiveBtn = $('modeImmersive');
  var modeImmersive180Btn = $('modeImmersive180');
  var modeImmersive70Btn = $('modeImmersive70');
  var modeImmersive90Btn = $('modeImmersive90');
  var modeImmersive110Btn = $('modeImmersive110');
  var modeImmersive130Btn = $('modeImmersive130');
  var modeImmersive150Btn = $('modeImmersive150');
  var modeSphereBtn = $('modeSphere');
  var modeCinemaBtn = $('modeCinema');
  var modeStereoBtn = $('modeStereo');
  var mode2dBtn = $('mode2d');
  var stereoSettings = $('stereoSettings');
  var stereoFormatSel = $('stereoFormat');
  var stereoFormatInfo = $('stereoFormatInfo');
  var stereoSwapChk = $('stereoSwap');
  var stereoStrengthEl = $('stereoStrength');
  var stereoStrengthVal = $('stereoStrengthVal');
  var demo3dBtn = $('demo3dBtn');
  var stereoWarn = $('stereoWarn');
  var centerBtn = $('centerBtn');
  var stereoBadge = $('stereoBadge');
  var modeAiBtn = $('modeAi');
  var aiSettings = $('aiSettings');
  var aiStatus = $('aiStatus');
  var aiParallax = $('aiParallax');
  var aiParallaxVal = $('aiParallaxVal');
  var aiBadge = $('aiBadge');
  var aiRetryBtn = $('aiRetryBtn');
  var cdnWarning = $('cdn-warning');
  var demoCanvas = $('demoCanvas2d');
  var demoBadge = $('demoBadge');
  var heroPick = $('heroPick');

  function setStatus(msg) { statusEl.textContent = msg || ''; }

  video.volume = 0.8;

  /* ---------- 内置演示：画布动画（海面日出）当视频源，打开页面就有画面 ----------
     以前一打开是个空播放器：video 没选文件就没有画面，3D 纹理全是黑的，像半成品。
     现在用一张画布画持续动画（星空 + 海面日出，零文件、零版权），captureStream 把它
     喂给同一个 video 元素——10 种模式共用的就是这个 video 的纹理，所以演示在所有
     模式下都能直接看。选了自己的文件就停演示、切回文件，本地不上传的原则不变。
     captureStream 不可用的老浏览器退一步：把画布本身铺在播放器里当 2D 演示，
     点任意模式按钮或选文件就撤下，露出原来的选文件提示。 */
  var demoActive = false;   /* 演示正在播（流或 2D 画布） */
  var demoFallback = false; /* 演示走的是 2D 画布直铺这条退路 */
  var demoRAF = null;

  function makeDemoPainter(ctx, w, h) {
    var horizon = Math.round(h * 0.62);
    var sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#070b2e');
    sky.addColorStop(0.45, '#33255c');
    sky.addColorStop(0.78, '#a34a2c');
    sky.addColorStop(1, '#e8893a');
    var sea = ctx.createLinearGradient(0, horizon, 0, h);
    sea.addColorStop(0, '#7a3b26');
    sea.addColorStop(0.25, '#2c1e44');
    sea.addColorStop(1, '#070d24');
    var stars = [];
    for (var i = 0; i < 90; i++) {
      stars.push({ x: Math.random() * w, y: Math.random() * horizon * 0.55, r: Math.random() * 1.4 + 0.4, p: Math.random() * Math.PI * 2 });
    }
    var clouds = [];
    for (var j = 0; j < 4; j++) {
      clouds.push({ x: Math.random() * w, y: h * (0.10 + Math.random() * 0.2), s: 0.7 + Math.random() * 0.9, v: 2 + Math.random() * 3 });
    }
    function paintCloud(c) {
      ctx.fillStyle = 'rgba(255,190,150,0.16)';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 130 * c.s, 17 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + 60 * c.s, c.y + 5 * c.s, 90 * c.s, 13 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x - 70 * c.s, c.y + 6 * c.s, 80 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return function paint(t) {
      var sunX = w * 0.5;
      var sunY = horizon - 26 + Math.sin(t * 0.11) * 7; /* 太阳贴着海面慢慢浮动 */
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, horizon + 1);
      /* 星星：越靠天顶越亮，慢慢闪 */
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        var fade = 1 - st.y / (horizon * 0.62);
        if (fade <= 0) continue;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.75 * fade * (0.55 + 0.45 * Math.sin(t * 0.9 + st.p))).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (var j = 0; j < clouds.length; j++) {
        var c = clouds[j];
        c.x += c.v * 0.016;
        if (c.x - 220 * c.s > w) c.x = -220 * c.s;
        paintCloud(c);
      }
      /* 太阳和光晕 */
      var glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 190);
      glow.addColorStop(0, 'rgba(255,190,90,0.55)');
      glow.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sunX - 200, sunY - 200, 400, 400);
      ctx.fillStyle = '#ffd9a0';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 44, 0, Math.PI * 2);
      ctx.fill();
      /* 海面 */
      ctx.fillStyle = sea;
      ctx.fillRect(0, horizon, w, h - horizon);
      ctx.fillStyle = 'rgba(255,220,170,0.5)';
      ctx.fillRect(0, horizon, w, 1.5);
      /* 太阳在水里的反光：一列随波光抖动的短横线 */
      for (var k = 0; k < 44; k++) {
        var y = horizon + 7 + k * 5.6;
        if (y > h - 4) break;
        var spread = 26 + k * 4.5;
        var len = spread * (0.45 + 0.4 * Math.abs(Math.sin(t * 0.7 + k * 1.93)));
        var cx = sunX + Math.sin(t * 0.9 + k * 1.37) * (4 + k * 0.55);
        ctx.fillStyle = 'rgba(255,175,90,' + (0.5 * (1 - k / 50)).toFixed(3) + ')';
        ctx.fillRect(cx - len / 2, y, len, 2.2);
      }
      /* 远处几道缓缓移动的波纹 */
      ctx.fillStyle = 'rgba(200,210,255,0.10)';
      for (var m = 0; m < 5; m++) {
        var wy = horizon + 26 + m * 48 + Math.sin(t * 0.35 + m * 2.1) * 3;
        ctx.fillRect((Math.sin(t * 0.05 + m * 1.7) * 0.5 + 0.5) * w * 0.4, wy, w * 0.45, 1.6);
      }
    };
  }

  function startDemo() {
    if (!demoCanvas || !demoCanvas.getContext) { dropHint.hidden = false; return; }
    var ctx = demoCanvas.getContext('2d');
    if (!ctx) { dropHint.hidden = false; return; }
    var paint = makeDemoPainter(ctx, demoCanvas.width, demoCanvas.height);
    var frameNo = 0;
    function frame(now) {
      demoRAF = requestAnimationFrame(frame);
      if ((frameNo++ & 1) === 1) return; /* 隔帧画，约 30fps，省电 */
      paint(now / 1000);
    }
    demoRAF = requestAnimationFrame(frame);
    demoActive = true;
    dropHint.hidden = true;
    demoBadge.hidden = false;
    var streamed = false;
    if (typeof demoCanvas.captureStream === 'function') {
      try {
        var stream = demoCanvas.captureStream(30);
        if (stream && stream.getVideoTracks && stream.getVideoTracks().length > 0) {
          video.srcObject = stream;
          video.muted = true; /* 演示没有声音，静音才能自动播放 */
          streamed = true;
        }
      } catch (e) { streamed = false; }
    }
    if (streamed) {
      setStatus('正在播放演示画面（海面日出）。点「选择本地视频」换成你自己的视频——只在本地播，不上传。');
      video.play().catch(function () {
        setStatus('演示画面已就绪，点一下「播放」就能看。换成你自己的视频，点「选择本地视频」。');
      });
    } else {
      /* 退路：画布直接铺在播放器里（2D 演示），点模式或选文件时撤下 */
      demoFallback = true;
      demoCanvas.hidden = false;
      setStatus('正在播放演示画面（2D 预览）。点「选择本地视频」换成你自己的视频——只在本地播，不上传。');
    }
  }

  function dismissDemoFallback() {
    if (!demoFallback) return;
    demoFallback = false;
    demoCanvas.hidden = true;
    dropHint.hidden = false;
  }

  function stopDemo() {
    if (demoRAF) { cancelAnimationFrame(demoRAF); demoRAF = null; }
    if (video.srcObject) {
      try {
        video.srcObject.getTracks().forEach(function (tr) { tr.stop(); });
      } catch (e) {}
      video.srcObject = null;
    }
    demoActive = false;
    demoFallback = false;
    demoCanvas.hidden = true;
    demoBadge.hidden = true;
  }

  if (heroPick) heroPick.addEventListener('click', function () { fileInput.click(); });

  /* ---------- 选本地视频（只在浏览器里播，不上传） ---------- */
  function loadFile(file) {
    if (!file) return;
    stopDemo(); /* 选了自己的视频：停掉演示，恢复音量设置 */
    video.muted = false;
    video.volume = volume.value / 100;
    currentFileName = file.name || ''; /* 3D「自动」猜格式要用文件名 */
    known3d = nameLooks3d(currentFileName); /* 是不是真 3D 按文件名线索重判，立体模式的警告跟着刷新 */
    video.loop = false; /* 站内 3D 演示片开的是循环播，自己的文件恢复正常单遍 */
    var url = URL.createObjectURL(file);
    video.src = url;
    video.load();
    applyStereoFormat(); /* 先按文件名猜一次；loadedmetadata 后还会按宽高比再校正一次 */
    updateStereoWarning();
    fileName.textContent = file.name;
    dropHint.hidden = true;
    setStatus('已加载：' + file.name + '，点播放开始。');
    video.play().catch(function () {
      setStatus('已加载：' + file.name + '。浏览器拦截了自动播放，点一下播放按钮。');
    });
  }
  fileInput.addEventListener('change', function () { loadFile(fileInput.files[0]); });

  /* 拖放视频到播放器上 */
  ['dragenter', 'dragover'].forEach(function (ev) {
    player.addEventListener(ev, function (e) { e.preventDefault(); player.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    player.addEventListener(ev, function (e) { e.preventDefault(); player.classList.remove('drag-over'); });
  });
  player.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });

  /* ---------- 播放控制（2D 和 3D 通用，都控同一个 video 元素） ---------- */
  function updatePlayBtn() { playBtn.textContent = video.paused ? '▶ 播放' : '⏸ 暂停'; }
  playBtn.addEventListener('click', function () {
    if (video.paused) { video.play().catch(function () {}); }
    else { video.pause(); }
  });
  video.addEventListener('play', updatePlayBtn);
  video.addEventListener('pause', updatePlayBtn);
  video.addEventListener('loadedmetadata', function () {
    /* 演示是直播流，没有总时长，显示「演示」而不是 00:00 */
    durTime.textContent = demoActive ? '演示' : fmt(video.duration);
    applyStereoFormat(); /* 宽高拿到了，「自动」模式按宽高比再校正一次 3D 源格式 */
  });
  video.addEventListener('timeupdate', function () {
    curTime.textContent = fmt(video.currentTime);
    if (isFinite(video.duration) && video.duration > 0 && !seek.dragging) {
      seek.value = Math.round(video.currentTime / video.duration * 1000);
    }
  });
  seek.addEventListener('pointerdown', function () { seek.dragging = true; });
  seek.addEventListener('pointerup', function () { seek.dragging = false; });
  seek.addEventListener('input', function () {
    if (isFinite(video.duration) && video.duration > 0) video.currentTime = seek.value / 1000 * video.duration;
  });
  volume.addEventListener('input', function () { video.volume = volume.value / 100; video.muted = false; });
  fsBtn.addEventListener('click', function () {
    if (document.fullscreenElement) { document.exitFullscreen().catch(function () {}); }
    else if (player.requestFullscreen) { player.requestFullscreen().catch(function () {}); }
  });

  /* ---------- 铺满窗口：只剩播放器，占满整个浏览器窗口 ----------
     切 class 不触发 window resize，所以切完必须手动调一次 resize，让 canvas 跟着新尺寸走。 */
  function isFilled() {
    return document.body.classList.contains('fill-window') || !!document.fullscreenElement;
  }
  function toggleFillWindow() {
    var on = document.body.classList.toggle('fill-window');
    updateExitBtn();
    if (on) {
      flashExitBar(); /* 一进铺满就先把顶部退出条亮出来 4 秒，让人知道出口在哪 */
      /* 进铺满时顺手试真全屏（2026-11-18 八改）：必须在同一个用户手势里调
         requestFullscreen 才有可能被允许；成功的话播放器被顶到真全屏，画面比纯 CSS
         铺满更大。失败（VP Safari 对元素全屏支持不稳）就 catch 住、CSS 铺满照常兜底，
         绝不能让一个未处理的 promise 拒绝冒警告、更不能打断铺满本身。
         退出走 exitFill：它先退真全屏再撤 fill-window 类，两边都收干净。 */
      if (player.requestFullscreen) {
        try {
          var fsPromise = player.requestFullscreen();
          if (fsPromise && fsPromise.catch) fsPromise.catch(function () {});
        } catch (err) {}
      }
    }
    else hideExitBar();
    /* resize 延后两帧（2026-11-18 八改）：旧写法加完 class 立刻调 resizeThree，
       那时浏览器还没把 position:fixed inset:0 的新布局算完，量到的 clientWidth/Height
       还是铺满前的旧尺寸，画布按旧尺寸渲染——Haze 复验「铺满后画面还是小」就是它。
       连套两层 requestAnimationFrame，等布局落定后再量，进铺满、退出铺满都一样。 */
    if (resizeThree) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { if (resizeThree) resizeThree(); });
      });
    }
  }
  fillBtn.addEventListener('click', toggleFillWindow);

  /* 悬浮「✕ 退出」按钮（在播放器内部，全屏时也渲染得到）：铺满或全屏任一状态在就显示；
     点它退出全屏 + 退出铺满，回到普通页面（模式按钮都在那儿）。2026-11-18 修：旧按钮挂在
     body 上、播放器一全屏就被盖住，Haze 在 VP 上找不到返回、只能刷新页面。 */
  function updateExitBtn() {
    if (!fillExitBtn) return;
    fillExitBtn.hidden = !isFilled();
  }
  /* 统一的退出动作：退出真全屏 + 退出铺满 + 收起退出条，回到普通页面 */
  function exitFill() {
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    if (document.body.classList.contains('fill-window')) toggleFillWindow();
    hideExitBar();
    updateExitBtn();
  }
  /* 两个出口共用同一个 exitFill（2026-11-18 五改，把调用关系写清）：
     顶部条 fillExitBar 和右下角 fillExitBtn 点下去走的是同一个 exitFill 函数
     （退真全屏 + 退铺满 + 收条），不存在两套退出逻辑。Haze 四改后实测：顶部条
     点了能退、右下角按钮点了没反应——源码里按钮的 click 本来就绑着 exitFill，
     嫌疑最大的是 player 的轻点 pointer 处理在 VP 的注视+捏合事件流里把按钮的
     点击搅黄了（按下/松手的落点判定、冒泡顺序都可能）。这一改三层防护：
     ① 按钮自己的 click 先 stopPropagation 再 exitFill，不让冒泡去 player；
     ② 再绑一对 pointerdown/pointerup 在按钮自身：按下确实落在按钮上、松手
        也在按钮上，就直接 exitFill——不依赖浏览器合成 click 那一步；
        exitFill 幂等，click 随后若再触发一次也只是无副作用的收尾；
     ③ player 的轻点 handler 开头先判落点：在任何 button 上直接返回不处理。 */
  var exitBtnPressed = false;
  if (fillExitBtn) {
    fillExitBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      exitFill();
    });
    fillExitBtn.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      exitBtnPressed = true;
    });
    fillExitBtn.addEventListener('pointerup', function (e) {
      e.stopPropagation();
      if (exitBtnPressed) { exitBtnPressed = false; exitFill(); }
    });
  }

  /* ---------- 冗余出口（2026-11-18 四改）：顶部居中大号「✕ 退出铺满」条 ----------
     右下角按钮的整条链（DOM 在 #player 内、body.fill-window 由 toggleFillWindow 切换、
     click 处理已绑定、CSS !important 强制显示）在源码里逐环核对都没问题，但 Haze 在 VP 上
     两次复验仍看不到——可能卡在他那侧的缓存旧版，或他进的其实是 WebXR 沉浸（DOM 根本不
     渲染）。所以再加一条不共用显隐逻辑的独立出口：铺满时点一下画面（轻点、不是拖动）就
     切换显示这条顶部大条；进铺满/进全屏时自动亮 4 秒。点条本身 = exitFill。 */
  var exitBarTimer = null;
  function showExitBar() { if (fillExitBar) fillExitBar.hidden = false; }
  function hideExitBar() {
    if (fillExitBar) fillExitBar.hidden = true;
    if (exitBarTimer) { clearTimeout(exitBarTimer); exitBarTimer = null; }
  }
  function flashExitBar() {
    showExitBar();
    if (exitBarTimer) clearTimeout(exitBarTimer);
    exitBarTimer = setTimeout(hideExitBar, 4000);
  }
  if (fillExitBar) fillExitBar.addEventListener('click', exitFill);
  /* 轻点画面切换退出条：pointerdown 记起点和时间，pointerup 时位移 <8px 且 <400ms 算轻点
     （拖动视角位移大，不会误触）；只在铺满/全屏时管用；点到播放器里的按钮不算画面轻点。
     2026-11-18 五改：两个 handler 开头都先判落点——在任何 button 上（或按钮里的
     子元素上）直接返回，连起点都不记，按钮的点击完全归按钮自己的 handler 管，
     杜绝轻点逻辑搅黄「✕ 退出」的点击（Haze 实测点了没反应、只有顶部条能退） */
  function tapOnButton(e) {
    return !!(e.target && e.target.closest && e.target.closest('button'));
  }
  var tapX = 0, tapY = 0, tapT = 0;
  var lastTapX = 0, lastTapY = 0, lastTapT = 0; /* 上一次轻点（双击退出判定用，2026-11-18 七改） */
  player.addEventListener('pointerdown', function (e) {
    if (tapOnButton(e)) return;
    exitBtnPressed = false; /* 按下没落在退出按钮上：清掉按钮的按下标记（拖动松手滑到按钮上不许误退） */
    tapX = e.clientX; tapY = e.clientY; tapT = Date.now();
  });
  player.addEventListener('pointerup', function (e) {
    if (tapOnButton(e)) return;
    if (!isFilled()) return;
    if (e.target !== canvas && e.target !== video) return; /* 只认画布/视频区，按钮区不触发 */
    var moved = Math.abs(e.clientX - tapX) + Math.abs(e.clientY - tapY);
    if (moved < 8 && Date.now() - tapT < 400) {
      /* 双击画面直接退出（2026-11-18 七改，冗余出口之三）：右下角按钮在 VP 上反复点不动
         （疑似 visionOS Safari 窗口底部边缘点按被系统抓握区吃掉，事件到不了按钮），
         所以给画面本身加一条不依赖按钮位置的出口——铺满/全屏下两次轻点间隔 <350ms
         且落点相近，第二次直接 exitFill。moved<8 的轻点判定在上面，拖动视角位移大、
         进不到这里，不会误退。单击行为不变：仍是切换顶部退出条显隐。 */
      var now = Date.now();
      var nearLast = Math.abs(e.clientX - lastTapX) + Math.abs(e.clientY - lastTapY) < 40;
      if (now - lastTapT < 350 && nearLast) {
        lastTapT = 0;
        exitFill();
        return;
      }
      lastTapT = now; lastTapX = e.clientX; lastTapY = e.clientY;
      if (fillExitBar && fillExitBar.hidden) flashExitBar(); else hideExitBar();
    }
  });

  /* 锁手势缩放（2026-11-18 七改）：Haze 复验 ?v=11 报「整个页面稍微一动就被放大，以前没有」。
     viewport 已有 maximum-scale=1/user-scalable=no、#scene 有 touch-action:none，但 2D/铺满时
     真正显示的 #video2d 和页面其余区域没锁，Safari 系的捏合手势事件和双击缩放仍能把页面放大。
     补齐：document 级拦 gesturestart/gesturechange/gestureend（Safari 专有手势事件），
     player 上拦 dblclick 与 touchmove（passive:false 才能 preventDefault）。
     #scene 的拖动视角走 pointer 事件，不受这几个拦截影响，照常。 */
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (type) {
    document.addEventListener(type, function (e) { e.preventDefault(); });
  });
  player.addEventListener('dblclick', function (e) { e.preventDefault(); });
  player.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

  /* 进出全屏也不触发 window resize，同样手动调一次，让 canvas 填满；退出按钮的显隐也跟着更新 */
  document.addEventListener('fullscreenchange', function () {
    updateExitBtn();
    if (document.fullscreenElement) flashExitBar(); else hideExitBar();
    if (resizeThree) resizeThree();
  });

  /* ---------- 3D ---------- */
  var threeOK = (typeof THREE !== 'undefined');
  var renderer = null, scene = null, camera = null;
  var resizeThree = null; /* initThree 里的 resize 对外暴露，铺满窗口/全屏切换时手动调用 */
  var placeXRPanelFn = null; /* initThree 里的 placeXRPanel 对外暴露，setMode/进沉浸时按当前模式的屏重新摆控制条（十一改） */
  var immersiveMesh = null, immersive180Mesh = null, immersive70Mesh = null, immersive90Mesh = null, immersive110Mesh = null, immersive130Mesh = null, immersive150Mesh = null, sphereMesh = null, cinemaGroup = null;
  var stereoLeftMesh = null, stereoRightMesh = null, stereoLeftTex = null, stereoRightTex = null;
  var aiLeftMesh = null, aiRightMesh = null, aiPreviewMesh = null;
  var aiLeftTex = null, aiRightTex = null, aiSbsTex = null;
  var currentFileName = '';      /* 3D「自动」猜源格式要用 */
  var known3d = false;           /* 当前源是不是已知真 3D（2026-11-18 五改）：站内 3D 演示片按钮置 true；
                                    选自己的文件时按文件名线索判断（与 resolveStereoFormat 同一套规则）。
                                    不是真 3D 又进了立体模式 → 亮大警告：2D 画面劈两半喂两眼怎么调都晕 */
  var stereoChoice = 'auto';     /* 用户选的源格式：auto / sbs / ou */
  var stereoResolved = 'sbs';    /* 实际按哪种排布采样：sbs / ou */
  var stereoSwap = false;        /* 交换左右眼：两眼喂反了立体看着最难受，勾上就把左右半幅对调 */
  var stereoShift = -0.35;       /* 立体强弱滑杆 -1..1（双向，2026-11-18 三改）：0=片子原始视差；
                                    负数（往左滑）=两眼采样窗相向收、视差变小治晕；正数（往右滑）=反向推开、视差变大。
                                    默认 -0.35（2026-11-18 八改：七改加到 -0.4 后 Haze 复验说眼睛稍费劲，小步回退到 -35）。旧版是单向收（0..1 强度），源视差方向和假设相反时
                                    越收越过头、0% 反而更晕，所以改成双向：行程内必有一点视差≈0（纯 2D） */
  var yaw = 0, pitch = 0, mode = 'immersive';

  /* 进沉浸回正（2026-11-18 九改，治「进沉浸后画面还是跑左边」）：标志位由 XR 按钮
     流程在 setSession 成功后置起，动画循环第一帧消费，见 xrTryRecenter。 */
  var xrRecenterPending = false, xrRecenterTries = 0;
  var XR_RECENTER_SIGN = 1; /* ← 回正符号开关：若 Haze 复验反馈画面偏得更厉害，只翻这一处（1 改 -1） */
  function xrTryRecenter(frame) {
    /* 推导：viewer pose 在旧参考系 S 里的朝向四元数 q → 注视方向 f = q·(0,0,-1)，
       注视偏航 gazeYaw = atan2(-f.x, -f.z)（绕 Y 的角，左转为正）。
       S' = S.getOffsetReferenceSpace(T) 的原点位于 T（在 S 中），同一姿态在 S' 中
       = T⁻¹ ∘（在 S 中）。要他在 S' 中正视前方（偏航归零），需 T 的旋转 = R_y(gazeYaw)
       本身，即偏移四元数 = 绕 Y 转 gazeYaw：{0, sin(gazeYaw/2), 0, cos(gazeYaw/2)}，
       位置不动。这样主屏（挂在参考系 -Z 正前方）就正对他按下进入那刻正看的方向。
       XR_RECENTER_SIGN 是给这个偏航准备的单点翻转开关：方向反了只改那一行。
       全部存在性判断 + try/catch：任何一步不支持就静默放弃，绝不让回正挡住进沉浸。 */
    try {
      if (!frame || !renderer || !renderer.xr) { xrRecenterPending = false; return; }
      var refSpace = renderer.xr.getReferenceSpace && renderer.xr.getReferenceSpace();
      if (!refSpace || !frame.getViewerPose) { xrRecenterPending = false; return; }
      var pose = frame.getViewerPose(refSpace);
      if (!pose) {
        /* 第一帧 pose 还没到：多等几帧再放弃，别把这次回正浪费掉（偏移只施加一次） */
        if (++xrRecenterTries > 30) xrRecenterPending = false;
        return;
      }
      xrRecenterPending = false;
      var o = pose.transform.orientation;
      var quat = new THREE.Quaternion(o.x, o.y, o.z, o.w);
      var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(quat);
      var gazeYaw = Math.atan2(-fwd.x, -fwd.z);
      if (!isFinite(gazeYaw) || Math.abs(gazeYaw) < 0.01) return; /* 本来就正对着，不用动 */
      if (typeof XRRigidTransform === 'undefined' || !refSpace.getOffsetReferenceSpace || !renderer.xr.setReferenceSpace) return;
      var half = XR_RECENTER_SIGN * gazeYaw / 2;
      var offsetSpace = refSpace.getOffsetReferenceSpace(new XRRigidTransform(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) }
      ));
      if (offsetSpace) renderer.xr.setReferenceSpace(offsetSpace);
    } catch (err) { xrRecenterPending = false; }
  }

  function enable2DFallback(reason) {
    canvas.style.display = 'none';
    video.classList.add('show-2d');
    cdnWarning.hidden = false;
    cdnWarning.textContent = reason;
    modeImmersiveBtn.disabled = true;
    modeSphereBtn.disabled = true;
    modeCinemaBtn.disabled = true;
    modeImmersive180Btn.disabled = true;
    modeImmersive70Btn.disabled = true;
    modeImmersive90Btn.disabled = true;
    modeImmersive110Btn.disabled = true;
    modeImmersive130Btn.disabled = true;
    modeImmersive150Btn.disabled = true;
    if (modeStereoBtn) modeStereoBtn.disabled = true;
    if (stereoSettings) stereoSettings.hidden = true;
    if (modeAiBtn) modeAiBtn.disabled = true;
    if (aiSettings) aiSettings.hidden = true;
    mode2dBtn.disabled = true;
    setStatus('当前是普通 2D 播放。');
  }

  function makeBackgroundTexture() {
    var c = document.createElement('canvas');
    c.width = 16; c.height = 512;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#02020a');
    grad.addColorStop(0.45, '#0a1030');
    grad.addColorStop(0.55, '#0d1440');
    grad.addColorStop(1, '#02020a');
    g.fillStyle = grad;
    g.fillRect(0, 0, 16, 512);
    return new THREE.CanvasTexture(c);
  }

  function makeStars(count, radius) {
    var pos = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var t = Math.random() * Math.PI * 2;
      var p = Math.acos(2 * Math.random() - 1);
      var r = radius + Math.random() * 30;
      pos[i * 3] = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.cos(p) * 0.6;
      pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, sizeAttenuation: true });
    return new THREE.Points(geo, mat);
  }

  function makeVideoTexture(flipX) {
    var tex = new THREE.VideoTexture(video);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.format = THREE.RGBFormat;
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    if (flipX) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.x = -1;
    }
    return tex;
  }

  /* ---------- 3D 立体：源格式解析 + 按眼采样 ----------
     立体视频把左右眼画面拼在一帧里：SBS 是左右并排（左眼=左半幅），OU 是上下并排（左眼=上半幅）。
     做法：同一个 video 建两份纹理，左眼纹理只采样左/上半幅，右眼纹理只采样右/下半幅
     （靠纹理的 repeat/offset 裁切 UV），分别贴在两块一模一样的 90° 弧幕上
     （2026-11-18 改：原来用 180° 上下通顶的球面，VP 真机看着又大又难受；先换 110° 弧幕，
     Haze 复验还是晕，再降到 90°：屏幕越小，同一份视差在眼睛里的角度越小，越不容易晕）。
     普通屏幕预览只显示左眼那块屏（左眼半幅画面）；进 WebXR 沉浸后，靠 three.js
     WebXRManager 的约定分工：左眼相机开 layer 1、右眼相机开 layer 2——左眼屏设到
     layer 1 就只有左眼看得见，右眼屏设到 layer 2 只有右眼看得见，这才是真立体，
     不是把同一幅画给两只眼。 */
  /* 文件名像不像真 3D：与 resolveStereoFormat 里「自动」判断用同一套线索
     （上下/OU/TB/overunder/topbottom → OU；左右/SBS/3D/sidebyside → SBS），
     命中任一就算「文件名自称是 3D」。只用来决定立体模式的警告亮不亮，不参与采样 */
  function nameLooks3d(name) {
    var n = (name || '').toLowerCase();
    if (n.indexOf('上下') >= 0 || /(^|[_\-\.\s])(ou|tb|overunder|topbottom)([_\-\.\s]|$)/.test(n)) return true;
    if (n.indexOf('左右') >= 0 || n.indexOf('sbs') >= 0 || n.indexOf('3d') >= 0 || n.indexOf('sidebyside') >= 0) return true;
    return false;
  }

  /* 立体模式的大警告显隐：正在立体模式、且源不是已知真 3D（还在播 2D 演示，
     或选的文件名看不出是 3D）时亮出来。只警告不硬拦——文件名没线索但其实是
     真 3D 的文件照样能看，警告文案里也写了怎么换到保证对的演示片 */
  function updateStereoWarning() {
    if (!stereoWarn) return;
    stereoWarn.hidden = !(mode === 'stereo' && (demoActive || !known3d));
  }

  function resolveStereoFormat() {
    if (stereoChoice === 'sbs' || stereoChoice === 'ou') return stereoChoice;
    var name = (currentFileName || '').toLowerCase();
    if (name.indexOf('上下') >= 0 || /(^|[_\-\.\s])(ou|tb|overunder|topbottom)([_\-\.\s]|$)/.test(name)) return 'ou';
    if (name.indexOf('左右') >= 0 || name.indexOf('sbs') >= 0 || name.indexOf('3d') >= 0 || name.indexOf('sidebyside') >= 0) return 'sbs';
    /* 文件名没线索就看宽高比：全幅 SBS 两个 16:9 并排约 32:9（>2.2），全幅 OU 上下叠约 16:18（<1.15）；
       半幅的两种都是 16:9，分不出来，默认 SBS（市面立体片绝大多数是 SBS） */
    if (video.videoWidth && video.videoHeight) {
      var ar = video.videoWidth / video.videoHeight;
      if (ar > 2.2) return 'sbs';
      if (ar < 1.15) return 'ou';
    }
    return 'sbs';
  }

  /* 立体强弱滑杆的显示文字：0=原始视差，负数=弱 X%，正数=强 X% */
  function stereoShiftText() {
    if (stereoShift === 0) return '原始视差';
    return stereoShift < 0 ? '弱 ' + Math.round(-stereoShift * 100) + '%' : '强 ' + Math.round(stereoShift * 100) + '%';
  }

  function applyStereoFormat() {
    stereoResolved = resolveStereoFormat();
    if (stereoFormatInfo) {
      var halfDesc;
      if (stereoResolved === 'sbs') halfDesc = 'SBS（左右并排，左眼取' + (stereoSwap ? '右' : '左') + '半幅）';
      else halfDesc = 'OU（上下并排，左眼取' + (stereoSwap ? '下' : '上') + '半幅）';
      stereoFormatInfo.textContent = '当前按 ' + halfDesc + ' 采样' +
        (stereoChoice === 'auto' ? '（自动判断，猜错了就手动选）' : '') +
        (stereoSwap ? '（已交换左右眼）' : '') +
        ' · 立体强弱 ' + stereoShiftText();
    }
    if (!stereoLeftTex || !stereoRightTex) return; /* three 没起来时只更新说明文字 */
    /* 立体强弱（双向）：delta 是两眼采样窗的相对平移量，可正可负。
       ★★ 视差永远在水平方向（u 轴），所以平移一律加在 offset.x 上，SBS 和 OU 都一样
       （2026-11-18 四改）。OU 只是把两只眼的图上下叠放——选哪只眼靠 repeat.y/offset.y
       选上半幅还是下半幅，但每只眼图里的视差仍然是左右方向的。旧版 OU 把 delta 加在
       offset.y 上（沿上下叠放的「拼接轴」平移）：水平视差一点没变，只给两眼之间添了
       垂直错位，越滑越晕——Haze 两次复验「滑杆滑到哪都晕、勾不勾交换都晕」就是这个 bug。
       以后绝不要再沿拼接轴平移，OU 的平移必须落在 u 轴。
       delta>0（滑杆往左）：两眼采样窗在 u 轴上相向收（基准在 0 的那只眼 +delta、在 0.5 的
       -delta；OU 按眼图所在半幅套同一规则），两眼采到的画面更接近，等效视差减小 2*delta，
       立体变弱治晕；滑到视差≈0 时画面变平（纯 2D，不可能再因视差晕），再滑过头视差反向、
       画面反着凸。delta<0（滑杆往右）：两窗反向推开，视差增大、立体更强（也更容易晕）。
       滑杆 0 = delta 0 = 片子原始视差；默认 -0.2（弱 20%）对应 delta=+0.006。
       交换左右眼时先按 swap 定基准窗再平移，勾不勾交换都生效。delta 上限 ±0.03（整帧的 3%）。 */
    var delta = -stereoShift * 0.03;
    if (stereoResolved === 'sbs') {
      /* 交换左右眼 = 左眼改取右半幅、右眼改取左半幅（offset 对调） */
      var lBase = stereoSwap ? 0.5 : 0, rBase = stereoSwap ? 0 : 0.5;
      stereoLeftTex.repeat.set(0.5, 1); stereoLeftTex.offset.set(lBase + (lBase === 0 ? delta : -delta), 0);
      stereoRightTex.repeat.set(0.5, 1); stereoRightTex.offset.set(rBase + (rBase === 0 ? delta : -delta), 0);
    } else {
      /* OU：repeat.y/offset.y 只负责选眼（纹理 flipY 后 v=1 是画面顶部：上半幅 = v 的
         [0.5, 1]，下半幅 = [0, 0.5]；交换左右眼 = 左眼改取下半幅、右眼改取上半幅）；
         强弱平移加在 offset.x 上（见上方注释，绝不要再沿 v 轴平移） */
      var ltBase = stereoSwap ? 0 : 0.5, rtBase = stereoSwap ? 0.5 : 0;
      stereoLeftTex.repeat.set(1, 0.5); stereoLeftTex.offset.set(ltBase === 0 ? delta : -delta, ltBase);
      stereoRightTex.repeat.set(1, 0.5); stereoRightTex.offset.set(rtBase === 0 ? delta : -delta, rtBase);
    }
  }

  /* 按「是不是正在 WebXR 沉浸」切换左右眼屏的可见性和图层：
     沉浸中：左眼屏 layer 1（只有左眼相机看得见）、右眼屏 layer 2（只有右眼看得见）；
     没沉浸（普通屏幕预览）：左眼屏回 layer 0 显示左眼半幅，右眼屏藏起来。 */
  function applyStereoEyes() {
    if (!stereoLeftMesh || !stereoRightMesh) return;
    var presenting = !!(renderer && renderer.xr && renderer.xr.isPresenting);
    if (mode === 'stereo' && presenting) {
      stereoLeftMesh.visible = true; stereoLeftMesh.layers.set(1);
      stereoRightMesh.visible = true; stereoRightMesh.layers.set(2);
    } else {
      stereoLeftMesh.visible = (mode === 'stereo'); stereoLeftMesh.layers.set(0);
      stereoRightMesh.visible = false; stereoRightMesh.layers.set(0);
    }
    if (stereoBadge) stereoBadge.hidden = !(mode === 'stereo' && !presenting);
    if (stereoSettings) stereoSettings.hidden = (mode !== 'stereo');
    updateStereoWarning(); /* 进出立体模式时警告跟着刷新（源变了由 loadFile/演示片按钮再调） */
  }

  /* ---------- AI 2D 转 3D：浏览器里实时估深度、合成右眼（参照 Owl3D 的网页路线） ----------
     Owl3D 的网页版照片工具就是在浏览器里跑 Depth Anything V2 Small 做深度估计；这里走同一条路：
     transformers.js v3.8.1 + onnx-community/depth-anything-v2-small 的量化版（约 27MB），
     device 先试 WebGPU、起不来回退 WASM。整套东西懒加载——只有第一次点「🤖 AI 2D转3D」才下载
     库和模型，不拖慢页面正常打开；模型下完走浏览器缓存，下次秒开。视频只在本机处理，不上传。
     自托管（2026-11-17 修 Failed to fetch 之后）：库 + WASM 运行时文件放在本站 /ai-lib/，
     模型文件住在 GCP VM（/var/www/html/models/，HF 式路径），由本站 Worker 的 /models-proxy/
     转发 + 边缘缓存，页面只跟自己域名打交道，不再依赖 jsdelivr / HuggingFace 的海外直连。
     流水线和离线工具（tools/convert2d3d/convert.py）一个做法：抓帧（自适应 224–384 宽）→ 深度推理 →
     归一化（采样取 2%/98% 分位，去极值；跨帧用 EMA 把范围稳住，免得深度"呼吸"）→ 最近 3 帧
     0.25/0.5/0.25 时序平滑（离线版用前后帧，实时没法预知下一帧，改用最近三帧同样的权重）→
     按深度前向 warp 合成右眼（近物位移大、最大视差默认画面宽 2.5%，单遍 z-buffer 取最近，
     空洞逐行取最近的已写像素、优先背景一侧拉伸填充）。左眼 = 原帧。
     渲染复用 3D 立体模式的双屏结构：两块 110° 弧幕贴 CanvasTexture（左=原帧、右=合成帧），
     WebXR 沉浸时靠 layer 1/2 分眼；普通屏幕预览用第三块屏贴左右并排（SBS）拼接图 + 角标说明。
     推理跟不上就自适应降频：下一次推理的间隔 = 上次耗时 ×1.05，下限 66ms、上限 600ms。
     失败兜底：加载或热身推理失败 → 状态行如实写原因、切回普通沉浸播放，绝不卡死、绝不假装在转。 */
  var AI_CDN_URL = '/ai-lib/transformers.min.js'; /* 自托管：本站同源，不再走 jsdelivr */
  var AI_MODEL_ID = 'onnx-community/depth-anything-v2-small';
  var aiState = 'idle'; /* idle | loading | ready | failed */
  var aiEstimator = null;
  var aiBackend = '';
  var aiRunning = false, aiBusy = false;
  var aiIntervalMs = 66, aiLastStart = 0;
  var aiFpsCount = 0, aiFpsTime = 0, aiFps = 0, aiErrCount = 0;
  var aiParallaxPct = 4; /* 默认视差（2026-11-18 八改：七改拉到 5 后 Haze 复验说眼睛稍费劲，回退到 4；滑杆范围 0–10 不变） */
  var aiProc = document.createElement('canvas');      /* 抓帧 + 推理输入 */
  var aiLeftCanvas = document.createElement('canvas'); /* 左眼 = 原帧 */
  var aiRightCanvas = document.createElement('canvas');/* 右眼 = 合成帧 */
  var aiSbsCanvas = document.createElement('canvas');  /* 平面预览：左右并排拼接 */
  var aiDepthHist = [];        /* 最近 3 帧归一化深度（0..1，1=最近），时序平滑用 */
  var aiLo = null, aiHi = null;/* 归一化范围的跨帧 EMA */
  var aiZbuf = null, aiWritten = null, aiNextScratch = null; /* warp 用的复用缓冲 */
  var aiCapW = 384;            /* 抓帧宽度：自适应 224–384（推理慢自动降，深度图不需要高清） */
  var aiLastDw = 0, aiLastDh = 0; /* 上一帧深度图的尺寸（画面静止时复用深度要对齐） */
  var aiDiffCanvas = document.createElement('canvas'); /* 32×18 小图测画面变化，静止就不重复推理 */
  aiDiffCanvas.width = 32; aiDiffCanvas.height = 18;
  var aiPrevSample = null;
  var aiMod = null;            /* transformers.js 模块（卡死后换后端重建推理器要用） */
  var aiHangSwitchUsed = false;/* WebGPU 推理卡死后只自动换一次 WASM，不来回横跳 */
  var aiLastMs = 0;            /* 上一帧推理耗时（毫秒），写进状态行，卡没卡一眼看清 */
  var aiComposeTimer = null;   /* 合成节拍定时器（画面不等推理，自己按 25fps 动） */
  var aiRenderFps = 0;         /* 3D 画面实际渲染帧率（渲染循环被系统冻住时是 0，状态行如实写） */

  function aiSetStatus(msg) { if (aiStatus) aiStatus.textContent = msg; }

  /* 按「是不是正在 WebXR 沉浸」切换 AI 三块屏：沉浸时左/右眼屏走 layer 1/2 分眼、预览屏藏起来；
     没沉浸时只亮 SBS 预览屏。逻辑和 applyStereoEyes 对应。 */
  function applyAiEyes() {
    if (!aiLeftMesh || !aiRightMesh || !aiPreviewMesh) return;
    var presenting = !!(renderer && renderer.xr && renderer.xr.isPresenting);
    if (mode === 'ai' && presenting) {
      aiLeftMesh.visible = true; aiLeftMesh.layers.set(1);
      aiRightMesh.visible = true; aiRightMesh.layers.set(2);
      aiPreviewMesh.visible = false; aiPreviewMesh.layers.set(0);
    } else {
      aiLeftMesh.visible = false; aiLeftMesh.layers.set(0);
      aiRightMesh.visible = false; aiRightMesh.layers.set(0);
      aiPreviewMesh.visible = (mode === 'ai'); aiPreviewMesh.layers.set(0);
    }
    if (aiBadge) aiBadge.hidden = !(mode === 'ai' && !presenting);
    if (aiSettings) aiSettings.hidden = (mode !== 'ai');
  }

  function aiResizeCanvases(W, H) {
    aiProc.width = W; aiProc.height = H;
    aiLeftCanvas.width = W; aiLeftCanvas.height = H;
    aiRightCanvas.width = W; aiRightCanvas.height = H;
    aiSbsCanvas.width = W * 2; aiSbsCanvas.height = H;
    [aiProc, aiLeftCanvas, aiRightCanvas, aiSbsCanvas].forEach(function (c) {
      var g = c.getContext('2d');
      g.fillStyle = '#000';
      g.fillRect(0, 0, c.width, c.height);
    });
    aiDepthHist = [];
    if (aiLeftTex) aiLeftTex.needsUpdate = true;
    if (aiRightTex) aiRightTex.needsUpdate = true;
    if (aiSbsTex) aiSbsTex.needsUpdate = true;
  }
  aiResizeCanvases(384, 216); /* 先按 16:9 占位，真尺寸在每帧推理前按视频宽高比校正 */

  /* 建一个指定后端+精度的推理器，建好后赋值给 aiEstimator/aiBackend。
     ★ 精度搭配是实测出来的：WebGPU 只配 fp16——q8 压缩模型在 WebGPU 上每帧要算约 12 秒（等于卡死）；
       WASM（CPU）配 q8 最快。 */
  function aiBuildEstimator(device, dtype) {
    return aiMod.pipeline('depth-estimation', AI_MODEL_ID, {
      device: device, dtype: dtype || (device === 'webgpu' ? 'fp16' : 'q8'), progress_callback: aiOnProgress
    }).then(function (est) {
      aiEstimator = est;
      aiBackend = (device === 'webgpu') ? 'WebGPU' : 'WASM';
      if (device === 'wasm') {
        /* WASM 时把模型输入图缩到 320×320（默认 518），算得快一截；接口不支持就自动忽略 */
        try {
          var fe = est.processor && est.processor.feature_extractor;
          if (fe) fe.size = { width: 320, height: 320 };
        } catch (e) {}
      }
      return est;
    });
  }
  var aiLastPct = -1;
  function aiOnProgress(info) {
    if (!info) return;
    if (info.status === 'progress' && info.file && String(info.file).indexOf('.onnx') >= 0 && typeof info.progress === 'number') {
      var pct = Math.floor(info.progress);
      if (pct !== aiLastPct) {
        aiLastPct = pct;
        aiSetStatus('正在下载深度模型… ' + pct + '%（只下这一次，之后走缓存）');
      }
    } else if (info.status === 'ready') {
      aiSetStatus('模型下载完，正在初始化推理…');
    }
  }
  /* 等视频有真画面再热身（最多等 3 秒），免得拿黑帧/空帧糊弄过去 */
  function aiWaitVideoReady() {
    return new Promise(function (res) {
      var t0 = Date.now();
      (function chk() {
        if ((video.readyState >= 2 && video.videoWidth) || Date.now() - t0 > 3000) res();
        else setTimeout(chk, 150);
      })();
    });
  }

  function aiLoadModel() {
    aiState = 'loading';
    if (aiRetryBtn) aiRetryBtn.hidden = true;
    aiSetStatus('正在加载 AI 深度模型（首次要下载模型文件，之后走浏览器缓存）…');
    import(AI_CDN_URL).then(function (mod) {
      aiMod = mod;
      try {
        mod.env.allowLocalModels = false;
        /* 模型走本站 Worker 代理（/models-proxy/ → GCP VM），不直连 HuggingFace */
        /* 模型文件：国外站经 Worker 代理（/models-proxy/）拉 VM 上的文件；国内 IP 版直接拉 VM 自己的 /models/（文件同一份） */
        mod.env.remoteHost = window.location.origin + (window.location.hostname === '35.209.165.26' ? '/models/' : '/models-proxy/');
        if (mod.env.backends && mod.env.backends.onnx && mod.env.backends.onnx.wasm) {
          /* 没跨源隔离（无 SharedArrayBuffer）时多线程 WASM 起不来，老实单线程兜底 */
          mod.env.backends.onnx.wasm.numThreads = window.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
          /* WASM 运行时文件也自托管在本站 /ai-lib/，不走 jsdelivr 默认地址 */
          mod.env.backends.onnx.wasm.wasmPaths = '/ai-lib/';
        }
      } catch (e) {}
      function attempt(device) {
        return aiBuildEstimator(device).then(function () {
          /* 热身一帧：等视频有画面，抓帧→推理→合成整条链真跑通，才算就绪 */
          return aiWaitVideoReady().then(function () { return aiInferOnce(); }).then(function () { aiComposeLatest(); });
        });
      }
      /* 顺序：WebGPU+fp16（显卡真加速）→ WASM+q8（CPU 兜底）。
         不再试 WebGPU+q8：实测每帧约 12 秒，是坑 */
      return attempt('webgpu').catch(function () {
        aiSetStatus('WebGPU 起不来，改用 WASM 推理（慢一些，照样全程本地）…');
        return attempt('wasm');
      });
    }).then(function () {
      aiState = 'ready';
      if (aiRetryBtn) aiRetryBtn.hidden = true;
      aiSetStatus('AI 转 3D 就绪（' + aiBackend + '）· 推理帧率看这里实时刷新');
      if (mode === 'ai') aiStartLoop();
    }).catch(function (err) {
      aiState = 'failed';
      aiEstimator = null;
      var reason = (err && err.message) ? err.message : String(err);
      /* 2026-11-18 三改：以前加载一失败就自动切回沉浸模式，Haze 在 VP 上点了 AI 立刻被弹回去，
         以为「AI 模式没有了、不能用了」。现在留在 AI 模式里：报错写在 AI 设置行，给「重新加载」按钮，
         模式绝不凭空消失，切不切走由用户自己决定。 */
      aiSetStatus('AI 模型没加载起来：' + reason + '。点右边「🔁 重新加载 AI」再试一次。');
      if (aiRetryBtn) aiRetryBtn.hidden = false;
      if (mode === 'ai') {
        setStatus('AI 转 3D 没启动起来：' + reason + '。还停在 AI 模式，点 AI 设置里的「🔁 重新加载 AI」重试，或切其他模式照常看片。');
      }
    });
  }

  function aiEnterMode() {
    if (aiState === 'ready') { aiStartLoop(); return; }
    if (aiState !== 'loading') aiLoadModel(); /* failed 也允许重试 */
  }

  function aiStartLoop() {
    if (aiRunning) return;
    aiRunning = true;
    aiLastStart = 0;
    aiErrCount = 0;
    if (!aiComposeTimer) aiComposeTimer = setInterval(aiComposeLatest, 40);
    aiTick(performance.now());
  }
  function aiStopLoop() {
    aiRunning = false;
    if (aiComposeTimer) { clearInterval(aiComposeTimer); aiComposeTimer = null; }
  }

  function aiTick(now) {
    if (!aiRunning || mode !== 'ai') { aiRunning = false; return; }
    /* 用定时器链不用 rAF：标签页不在最前面时 rAF 会完全停摆、推理一帧都不出；定时器至少还走得动，前台看时一样快 */
    setTimeout(function () { aiTick(performance.now()); }, 50);
    if (aiBusy || aiState !== 'ready') return;
    if (now - aiLastStart < aiIntervalMs) return;
    if (video.readyState < 2 || !video.videoWidth) return;
    aiLastStart = now;
    aiBusy = true;
    var t0 = performance.now();
    aiInferOnce().then(function (done) {
      aiBusy = false;
      if (!done) return;
      aiErrCount = 0;
      var dt = performance.now() - t0;
      aiLastMs = Math.round(dt);
      aiIntervalMs = Math.max(66, Math.min(600, dt * 1.05)); /* 跟不上就自动降频，下限间隔 66ms */
      /* 自适应分辨率：推理超过 220ms 就降一档抓帧宽度，快（<70ms）了再慢慢升回去 */
      if (dt > 220 && aiCapW > 224) aiCapW = aiCapW > 320 ? 320 : (aiCapW > 256 ? 256 : 224);
      else if (dt < 70 && aiCapW < 384) aiCapW = aiCapW < 256 ? 256 : (aiCapW < 320 ? 320 : 384);
      aiFpsCount++;
      var nowMs = performance.now();
      if (aiFpsTime === 0) { aiFpsTime = nowMs; aiFpsCount = 0; }
      else if (nowMs - aiFpsTime >= 1000) {
        var winMs = nowMs - aiFpsTime;
        aiFps = Math.round(aiFpsCount * 1000 / winMs);
        aiRenderFps = Math.round((window.__aiRenderCount || 0) * 1000 / winMs);
        window.__aiRenderCount = 0;
        aiFpsCount = 0; aiFpsTime = nowMs;
        if (mode === 'ai') {
          aiSetStatus('AI 转 3D 运行中（' + aiBackend + '）· 推理 ' + aiFps + ' fps · 单帧 ' + aiLastMs + 'ms · 渲染 ' + aiRenderFps + ' fps · 视差 ' + aiParallaxPct.toFixed(1) + '% · 全程本地，不上传');
        }
      }
    }).catch(function (err) {
      aiBusy = false;
      var reason = (err && err.message) ? err.message : String(err);
      /* WebGPU 推理卡死（超时无结果）：不当普通错误停掉，自动换 WASM 后端接着转，只换这一次 */
      if (reason.indexOf('推理超时') >= 0 && aiBackend === 'WebGPU' && !aiHangSwitchUsed && aiMod) {
        aiHangSwitchUsed = true;
        aiErrCount = 0;
        aiSetStatus('WebGPU 算到一半卡住了，正在换备用算法（WASM）接着转…');
        aiBuildEstimator('wasm').then(function () {
          aiSetStatus('已换成 WASM 后端，继续转 3D（慢一点，但能动）');
        }).catch(function () {
          if (mode === 'ai') {
            aiStopLoop();
            aiState = 'failed';
            aiSetStatus('AI 两个后端都起不来。点「🔁 重新加载 AI」再试一次。');
            if (aiRetryBtn) aiRetryBtn.hidden = false;
            setStatus('AI 转 3D 两个后端都起不来。还停在 AI 模式，可点「🔁 重新加载 AI」重试，或切其他模式照常看片。');
          }
        });
        return;
      }
      aiErrCount++;
      if (aiErrCount >= 3 && mode === 'ai') {
        aiStopLoop();
        aiSetStatus('AI 推理连续出错，已停：' + reason + '。切到别的模式再切回来可重新启动。');
        setStatus('AI 转 3D 推理出错（' + reason + '），已停下。还停在 AI 模式：切到别的模式再切回来即可重启，或看其他模式照常看片。');
      }
    });
  }

  /* 画面变化量：把当前帧缩到 32×18 比上一帧的平均亮度差（0–255）。
     几乎没变（对白特写、静态镜头）就跳过推理、复用上一帧深度——省下的算力最可观。 */
  function aiFrameDiff() {
    var g = aiDiffCanvas.getContext('2d');
    g.drawImage(video, 0, 0, 32, 18);
    var d = g.getImageData(0, 0, 32, 18).data;
    if (!aiPrevSample || aiPrevSample.length !== d.length) { aiPrevSample = new Uint8ClampedArray(d); return 999; }
    var sum = 0;
    for (var i = 0; i < d.length; i += 4) sum += Math.abs(d[i] - aiPrevSample[i]);
    aiPrevSample.set(d);
    return sum / (32 * 18);
  }

  /* 推理一帧：抓帧 → 推理 → 归一化 → 存下深度。合成不在这做——aiComposeLatest 用独立节拍
     拿最新深度套当前画面，画面按自己的帧率动，不等推理（推理 3 帧/秒，画面照样流畅）。 */
  function aiInferOnce() {
    if (!aiEstimator) return Promise.resolve(false);
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return Promise.resolve(false);
    var W = Math.min(aiCapW, video.videoWidth);
    var H = Math.max(2, Math.round(W * video.videoHeight / video.videoWidth));
    if (aiProc.width !== W || aiProc.height !== H) aiResizeCanvases(W, H);
    aiProc.getContext('2d').drawImage(video, 0, 0, W, H);
    /* 画面几乎静止：跳过推理，深度复用上一帧（合成节拍照常用新画面套旧深度） */
    if (aiDepthHist.length && aiLastDw > 0 && aiFrameDiff() < 1.2) {
      return Promise.resolve(true);
    }
    /* 单帧推理加 12 秒看门狗：WebGPU 偶发会把一帧算到天荒地老还不报错，
       没有这道闸，aiBusy 永远占着、画面静默冻住，状态行还假装"运行中" */
    var inferPromise = aiEstimator(aiProc);
    var watchdog = new Promise(function (resolve, reject) {
      setTimeout(function () { reject(new Error('推理超时（12 秒没出结果）')); }, 12000);
    });
    return Promise.race([inferPromise, watchdog]).then(function (out) {
      var res = Array.isArray(out) ? out[0] : out;
      if (!res || !res.predicted_depth) throw new Error('深度推理没有返回结果');
      var td = res.predicted_depth;
      var dims = td.dims, dh = dims[dims.length - 2], dw = dims[dims.length - 1];
      if (!td.data || td.data.length < dw * dh) throw new Error('深度数据不完整');
      aiLastDw = dw; aiLastDh = dh;
      aiDepthHist.push(aiNormalizeDepth(td.data, dw, dh));
      if (aiDepthHist.length > 3) aiDepthHist.shift();
      return true;
    });
  }

  /* 合成节拍（约 25 次/秒）：抓当前画面，套最新一帧深度合成左右眼。
     深度还没出来时先平铺同一画面（2D 双份），保证点开 AI 模式画面立刻是活的、不黑屏。 */
  function aiComposeLatest() {
    if (mode !== 'ai' || !video.videoWidth || video.readyState < 2) return;
    var W = Math.min(aiCapW, video.videoWidth);
    var H = Math.max(2, Math.round(W * video.videoHeight / video.videoWidth));
    if (aiProc.width !== W || aiProc.height !== H) aiResizeCanvases(W, H);
    aiProc.getContext('2d').drawImage(video, 0, 0, W, H);
    if (aiDepthHist.length && aiLastDw > 0) {
      aiCompose(W, H, aiSmoothDepth(), aiLastDw, aiLastDh);
    } else {
      var lctx = aiLeftCanvas.getContext('2d');
      lctx.drawImage(aiProc, 0, 0);
      var rctx = aiRightCanvas.getContext('2d');
      rctx.drawImage(aiProc, 0, 0);
      var sctx = aiSbsCanvas.getContext('2d');
      sctx.drawImage(aiLeftCanvas, 0, 0);
      sctx.drawImage(aiRightCanvas, W, 0);
      if (aiLeftTex) aiLeftTex.needsUpdate = true;
      if (aiRightTex) aiRightTex.needsUpdate = true;
      if (aiSbsTex) aiSbsTex.needsUpdate = true;
    }
  }

  /* 归一化到 0..1（1=最近）：采样取 2%/98% 分位当范围（去极值），范围跨帧 EMA 平滑防"呼吸"。
     Depth Anything 的输出值越大越近，和离线工具同一口径。 */
  function aiNormalizeDepth(raw, dw, dh) {
    var n = dw * dh;
    var step = Math.max(1, Math.floor(n / 4096));
    var sample = [];
    for (var i = 0; i < n; i += step) sample.push(raw[i]);
    sample.sort(function (a, b) { return a - b; });
    var lo = sample[Math.floor(sample.length * 0.02)];
    var hi = sample[Math.floor(sample.length * 0.98)];
    if (aiLo === null || aiHi === null) { aiLo = lo; aiHi = hi; }
    else { aiLo = aiLo * 0.85 + lo * 0.15; aiHi = aiHi * 0.85 + hi * 0.15; }
    var range = Math.max(aiHi - aiLo, 1e-6);
    var out = new Float32Array(n);
    for (var j = 0; j < n; j++) {
      var v = (raw[j] - aiLo) / range;
      out[j] = v < 0 ? 0 : (v > 1 ? 1 : v);
    }
    return out;
  }

  /* 3 帧时序平滑 0.25/0.5/0.25（权重同离线工具）；只有 2 帧时先按 0.4/0.6 凑合一帧 */
  function aiSmoothDepth() {
    var h = aiDepthHist, n = h.length;
    if (n === 1 || h[0].length !== h[n - 1].length) return h[n - 1];
    var out = new Float32Array(h[n - 1].length);
    var i;
    if (n === 2) {
      for (i = 0; i < out.length; i++) out[i] = h[0][i] * 0.4 + h[1][i] * 0.6;
    } else {
      for (i = 0; i < out.length; i++) out[i] = h[0][i] * 0.25 + h[1][i] * 0.5 + h[2][i] * 0.25;
    }
    return out;
  }

  function aiCompose(W, H, depth01, dw, dh) {
    var lctx = aiLeftCanvas.getContext('2d');
    lctx.drawImage(aiProc, 0, 0);
    var src = lctx.getImageData(0, 0, W, H);
    var rctx = aiRightCanvas.getContext('2d');
    var out = rctx.createImageData(W, H);
    aiWarpRight(src, depth01, dw, dh, out, aiParallaxPct / 100 * W);
    rctx.putImageData(out, 0, 0);
    var sctx = aiSbsCanvas.getContext('2d');
    sctx.drawImage(aiLeftCanvas, 0, 0);
    sctx.drawImage(aiRightCanvas, W, 0);
    if (aiLeftTex) aiLeftTex.needsUpdate = true;
    if (aiRightTex) aiRightTex.needsUpdate = true;
    if (aiSbsTex) aiSbsTex.needsUpdate = true;
  }

  /* 按深度把原帧前向 warp 成右眼：近物在右眼里相对左移，位移 = 深度 × 最大视差。
     单遍 z-buffer（同一目标点取深度最大的源像素 = 最近，和离线版排序覆盖的结果一致）；
     空洞逐行填充：取左右最近的已写像素里深度更小（背景）的一侧拉伸过来。 */
  function aiWarpRight(src, depth01, dw, dh, out, maxShift) {
    var W = src.width, H = src.height;
    var sd = src.data, od = out.data;
    var n = W * H, i, x, y;
    if (!aiZbuf || aiZbuf.length !== n) {
      aiZbuf = new Float32Array(n);
      aiWritten = new Uint8Array(n);
      aiNextScratch = new Int32Array(W);
    }
    var z = aiZbuf, wr = aiWritten;
    z.fill(-1); wr.fill(0);
    for (y = 0; y < H; y++) {
      var dy = Math.min(dh - 1, Math.floor(y * dh / H));
      for (x = 0; x < W; x++) {
        var dxs = Math.min(dw - 1, Math.floor(x * dw / W));
        var d = depth01[dy * dw + dxs];
        var tx = Math.round(x - d * maxShift);
        if (tx < 0 || tx >= W) continue;
        var j = y * W + tx;
        if (d > z[j]) {
          z[j] = d;
          var si = (y * W + x) * 4, di = j * 4;
          od[di] = sd[si]; od[di + 1] = sd[si + 1]; od[di + 2] = sd[si + 2]; od[di + 3] = 255;
          wr[j] = 1;
        }
      }
    }
    for (y = 0; y < H; y++) {
      var row = y * W;
      var nxt = -1;
      for (x = W - 1; x >= 0; x--) { aiNextScratch[x] = nxt; if (wr[row + x]) nxt = row + x; }
      var last = -1;
      for (x = 0; x < W; x++) {
        var idx = row + x;
        if (wr[idx]) { last = idx; continue; }
        var rIdx = aiNextScratch[x];
        var pick = -1;
        if (last >= 0 && rIdx >= 0) pick = (z[last] <= z[rIdx]) ? last : rIdx;
        else pick = last >= 0 ? last : rIdx;
        if (pick >= 0) {
          var s4 = pick * 4, d4 = idx * 4;
          od[d4] = od[s4]; od[d4 + 1] = od[s4 + 1]; od[d4 + 2] = od[s4 + 2]; od[d4 + 3] = 255;
        }
      }
    }
    for (i = 3; i < od.length; i += 4) { if (od[i] === 0) od[i] = 255; } /* 万一有漏填的点，至少不透明 */
  }

  function makeCanvasTexture(c) {
    var tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.format = THREE.RGBFormat;
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function initThree() {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    /* 参考空间显式用 'local'（2026-11-18 八改）：以前只在点「进入沉浸模式」按钮后、
       requestSession 回来才顺手设一次；现在 initThree 里就明确设好，语义不依赖
       请求参数里 optionalFeatures 给没给 'local-floor'。按钮 handler 里那次保留，
       两次设同一个值无副作用。治「偶尔点完沉浸整个画面跑到左边」的一半（另一半是
       下面的 sessionstart 复位 yaw/pitch + 相机旋转）。 */
    if (renderer.xr) renderer.xr.setReferenceSpaceType('local');
    scene = new THREE.Scene();
    /* 默认 220° 沉浸模式，相机视野 90°；影院模式切回 75°（见 setMode） */
    camera = new THREE.PerspectiveCamera(90, 16 / 9, 0.1, 300);
    camera.rotation.order = 'YXZ';
    camera.position.set(0, 0, 0);

    /* 220° 沉浸：按 Apple TV 沉浸视频的标准——Apple 的沉浸片是 180° 起、能延到 230°，
       我们取 220°：画面在正前方展开、余光里还有，不用转身。半球从 160° 起、盖 220°，正好以 -Z（正前方）为中心。 */
    var immersiveGeo = new THREE.SphereGeometry(50, 64, 40, Math.PI * 160 / 180, Math.PI * 220 / 180);
    var immersiveMat = new THREE.MeshBasicMaterial({ map: makeVideoTexture(false), side: THREE.BackSide });
    immersiveMesh = new THREE.Mesh(immersiveGeo, immersiveMat);
    scene.add(immersiveMesh);

    /* 180° 沉浸：Apple 沉浸视频的标准角度，画面铺满正前方 180°。半球从 180° 起、盖 180°，正好以 -Z（正前方）为中心。 */
    var immersive180Geo = new THREE.SphereGeometry(50, 64, 40, Math.PI * 180 / 180, Math.PI * 180 / 180);
    var immersive180Mat = new THREE.MeshBasicMaterial({ map: makeVideoTexture(false), side: THREE.BackSide });
    immersive180Mesh = new THREE.Mesh(immersive180Geo, immersive180Mat);
    immersive180Mesh.visible = false;
    scene.add(immersive180Mesh);

    /* 70° 沉浸：手机镜头拍到的范围大概 65°，加 5° 就是 70°。不用 220°/180° 那种上下通顶的球面
       （那样画面会被上下裁掉一半），屏按 16:9 比例做：水平 70°、垂直约 39°，居中在正前方。
       水平以 -Z 为中心（phi 从 235° 起、盖 70°）；垂直用 thetaStart/thetaLength 限制在 70.5°–109.5°，
       正好以水平视线为中心。FOV 90° 时屏完整显示在视野中央，四周是黑的，像关了灯的影院。 */
    var immersive70Geo = new THREE.SphereGeometry(50, 64, 40, Math.PI * 235 / 180, Math.PI * 70 / 180, Math.PI * 70.5 / 180, Math.PI * 39 / 180);
    var immersive70Mat = new THREE.MeshBasicMaterial({ map: makeVideoTexture(false), side: THREE.BackSide });
    immersive70Mesh = new THREE.Mesh(immersive70Geo, immersive70Mat);
    immersive70Mesh.visible = false;
    scene.add(immersive70Mesh);

    /* 90°/110°/130°/150° 沉浸：照 70° 模式的做法，屏按 16:9 比例做（高 = 宽 × 9/16），居中在正前方，
       不用 220°/180° 那种上下通顶的球面。水平以 -Z 为中心，垂直用 thetaStart/thetaLength 限制在以水平视线为中心的范围。
       90°：水平 225°–315°、垂直 64.7°–115.3°；110°：水平 215°–325°、垂直 59.1°–121.0°；
       130°：水平 205°–335°、垂直 53.4°–126.5°；150°：水平 195°–345°、垂直 47.8°–132.2°。
       半径同样 50，内侧贴视频纹理、不翻转，默认隐藏。FOV 保持 90°。
       90°/110° 的屏能一眼看全；130°/150° 的屏比视野宽，左右两边要转头才看得到，跟 220° 一个道理，不是 bug。 */
    var immersive90Geo = new THREE.SphereGeometry(50, 64, 40, Math.PI * 225 / 180, Math.PI * 90 / 180, Math.PI * 64.7 / 180, Math.PI * 50.6 / 180);
    var immersive90Mat = new THREE.MeshBasicMaterial({ map: makeVideoTexture(false), side: THREE.BackSide });
    immersive90Mesh = new THREE.Mesh(immersive90Geo, immersive90Mat);
    immersive90Mesh.visible = false;
    scene.add(immersive90Mesh);

    var immersive110Geo = new THREE.SphereGeometry(50, 64, 40, Math.PI * 215 / 180, Math.PI * 110 / 180, Math.PI * 59.1 / 180, Math.PI * 61.9 / 180);
    var immersive110Mat = new THREE.MeshBasicMaterial({ map: makeVideoTexture(false), side: THREE.BackSide });
    immersive110Mesh = new THREE.Mesh(immersive110Geo, immersive110Mat);
    immersive110Mesh.visible = false;
    scene.add(immersive110Mesh);

    var immersive130Geo = new THREE.SphereGeometry(50, 64, 40, Math.PI * 205 / 180, Math.PI * 130 / 180, Math.PI * 53.4 / 180, Math.PI * 73.1 / 180);
    var immersive130Mat = new THREE.MeshBasicMaterial({ map: makeVideoTexture(false), side: THREE.BackSide });
    immersive130Mesh = new THREE.Mesh(immersive130Geo, immersive130Mat);
    immersive130Mesh.visible = false;
    scene.add(immersive130Mesh);

    var immersive150Geo = new THREE.SphereGeometry(50, 64, 40, Math.PI * 195 / 180, Math.PI * 150 / 180, Math.PI * 47.8 / 180, Math.PI * 84.4 / 180);
    var immersive150Mat = new THREE.MeshBasicMaterial({ map: makeVideoTexture(false), side: THREE.BackSide });
    immersive150Mesh = new THREE.Mesh(immersive150Geo, immersive150Mat);
    immersive150Mesh.visible = false;
    scene.add(immersive150Mesh);

    /* 360° 球幕：整球内侧，等距长方形的真 360 视频映射就是对的 */
    var sphereGeo = new THREE.SphereGeometry(50, 64, 40);
    var sphereMat = new THREE.MeshBasicMaterial({ map: makeVideoTexture(false), side: THREE.BackSide });
    sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    sphereMesh.visible = false;
    scene.add(sphereMesh);

    /* 3D 立体：两块一模一样的屏，左眼屏贴左眼纹理、右眼屏贴右眼纹理，
       两份纹理各自只采样源帧的一半（见 applyStereoFormat）。
       屏的几何 2026-11-18 改：原来照 180° 沉浸做上下通顶的球面（theta 从极点到极点），
       Haze 在 VP 真机上反馈 SBS/OU 看着都很难受；先改成 110° 有边界弧幕，复验还是晕，
       再降到和 90° 沉浸模式同参数（水平 225° 起盖 90°、垂直 64.7°–115.3°，按 16:9
       居中在正前方）：屏幕越小，同一份源视差在眼睛里的角度越小，越不容易晕；仍不包极点。
       配合「立体强度」滑杆（采样窗相向平移收视差，见 applyStereoFormat）双管齐下治晕。
       普通预览只亮左眼屏；进 WebXR 后由 applyStereoEyes 按 layer 1/2 分给左右眼。
       2026-11-18 九改：Haze 复验说 AI 模式（130°）铺满能铺满、立体这边明显小一圈——
       立体屏改回和 AI/130° 沉浸同参数（水平 205° 起盖 130°、垂直 53.4°–126.5°），
       两边一样大；晕不晕主要靠立体强度滑杆收视差，屏大小不再兼着治晕的活。 */
    stereoLeftTex = makeVideoTexture(false);
    stereoRightTex = makeVideoTexture(false);
    /* 强弱滑杆双向平移时采样窗会越过源帧边缘：纹理设成重复包裹，越界部分绕回来采样，
       免得钳边（ClampToEdge）把边缘像素拉成一条花边 */
    stereoLeftTex.wrapS = stereoLeftTex.wrapT = THREE.RepeatWrapping;
    stereoRightTex.wrapS = stereoRightTex.wrapT = THREE.RepeatWrapping;
    var stereoGeo = new THREE.SphereGeometry(50, 64, 40, Math.PI * 205 / 180, Math.PI * 130 / 180, Math.PI * 53.4 / 180, Math.PI * 73.1 / 180);
    stereoLeftMesh = new THREE.Mesh(stereoGeo, new THREE.MeshBasicMaterial({ map: stereoLeftTex, side: THREE.BackSide }));
    stereoRightMesh = new THREE.Mesh(stereoGeo, new THREE.MeshBasicMaterial({ map: stereoRightTex, side: THREE.BackSide }));
    stereoLeftMesh.visible = false;
    stereoRightMesh.visible = false;
    scene.add(stereoLeftMesh);
    scene.add(stereoRightMesh);
    applyStereoFormat();

    /* AI 2D转3D：和 3D 立体一样的三块屏，纹理换成画布——左眼屏贴原帧画布、右眼屏贴
       AI 合成画布、预览屏贴左右并排拼接画布。显隐和分眼由 applyAiEyes 按是否沉浸统一管，
       画布内容由 AI 流水线（aiTick/aiCompose）实时刷新，模型没就绪时是黑屏，进模式会先加载。
       屏的几何 2026-11-18 改：原来是 180° 上下通顶的球面，Haze 在 VP 真机上反馈屏幕巨大、
       画面顶上和下边交叉扭到一起、像无数条线连到一个点——那是整幅画面包到球面上下极点
       被挤压的典型样子。先改成和 110° 沉浸模式同参数的有边界弧幕（水平 110°、垂直
       59.1°–121.0°），画面只贴在正前方一块弧幕上，上下留边，绝不碰极点，尺寸也小一档。
       2026-11-18 00:28 二改：Haze 复验说 110° 能看了、不扭了，但屏幕感觉小了点——
       换成 130° 沉浸模式同参数（水平 205° 起盖 130°、垂直 53.4°–126.5°，仍按 16:9
       居中在正前方）；垂直方向离上下极点各留 53° 以上的边，绝不回到包极点的老几何。 */
    aiLeftTex = makeCanvasTexture(aiLeftCanvas);
    aiRightTex = makeCanvasTexture(aiRightCanvas);
    aiSbsTex = makeCanvasTexture(aiSbsCanvas);
    var aiGeo = new THREE.SphereGeometry(50, 64, 40, Math.PI * 205 / 180, Math.PI * 130 / 180, Math.PI * 53.4 / 180, Math.PI * 73.1 / 180);
    aiLeftMesh = new THREE.Mesh(aiGeo, new THREE.MeshBasicMaterial({ map: aiLeftTex, side: THREE.BackSide }));
    aiRightMesh = new THREE.Mesh(aiGeo, new THREE.MeshBasicMaterial({ map: aiRightTex, side: THREE.BackSide }));
    aiPreviewMesh = new THREE.Mesh(aiGeo, new THREE.MeshBasicMaterial({ map: aiSbsTex, side: THREE.BackSide }));
    aiLeftMesh.visible = false;
    aiRightMesh.visible = false;
    aiPreviewMesh.visible = false;
    scene.add(aiLeftMesh);
    scene.add(aiRightMesh);
    scene.add(aiPreviewMesh);
    applyAiEyes();

    /* WebXR 会话开始/结束时切换左右眼分工（three 的 WebXRManager 会派发这两个事件） */
    if (renderer.xr && renderer.xr.addEventListener) {
      renderer.xr.addEventListener('sessionstart', applyStereoEyes);
      renderer.xr.addEventListener('sessionend', applyStereoEyes);
      renderer.xr.addEventListener('sessionstart', applyAiEyes);
      renderer.xr.addEventListener('sessionend', applyAiEyes);
    }

    /* 进沉浸先回正中（2026-11-18 八改，治「偶尔点完沉浸整个画面跑到左边」）：
       真正的偏移来源查清了——不在 applyStereoEyes/applyAiEyes（它们只 set visible 和
       layers，绝对赋值、重入幂等，从不改几何位置），而在 2D 预览的拖动状态：渲染循环
       每帧把 camera.rotation 写成 yaw/pitch，进 XR 的瞬间这两个值冻结在最后一次拖动
       的位置上，XR 渲染又是以这台相机的姿态为基准的，于是进沉浸前最后往哪边拖过、
       整个画面就往哪边偏。以前每次切模式 setMode 会顺手归零，所以只是「偶尔」犯。
       现在 sessionstart 就把 yaw/pitch 清零、相机旋转复位，沉浸永远从正前方开始。
       九改注：?v=13 复验仍偶发左偏——复查确认清零没漏（清的就是 yaw/pitch 变量
       本身）、loop() 写 camera.rotation 前已有 isPresenting 早退，app.js 侧没有
       「每帧无条件写」的漏点；剩余的偏来自参考系本身的朝向与他按下进入那刻的
       注视方向不一致，九改另加第一帧参考系回正（xrTryRecenter）兜底根治。 */
    if (renderer.xr && renderer.xr.addEventListener) {
      renderer.xr.addEventListener('sessionstart', function () {
        yaw = 0; pitch = 0;
        if (camera) camera.rotation.set(0, 0, 0);
      });
    }

    /* ---------- 沉浸内浮动控制条（2026-11-18 八改，治「沉浸里没法调进度」） ----------
       为什么在 three.js 场景里做：WebXR 沉浸期间 DOM 根本不渲染（平台限制，退出按钮
       都做不了），想在头显里调进度只能把控件画进 3D 场景。做法：一块 1.15×0.24m 的
       小面板挂在原点正前方 1.6m、视线下方 0.55m 处（主沉浸屏在正前方 -Z、半径 50，
       面板朝向与它一致、面向原点也就是面向用户），CanvasTexture 画三段按钮
       （⏪10秒 / ⏯播放暂停 / 10秒⏩）+ 顶部进度条 + 时间文字，每 500ms 重绘进度。
       交互走 WebXR 标准接法：renderer.xr.getController(0/1) 的 'select' 事件
       （visionOS 的注视+捏合会以 transient-pointer 输入源发 select），拿 controller
       的 targetRay 和面板求交，按交点 UV 分段处理；点在进度条区域就按 x 比例 seek。
       只在 XR presenting 期间可见，普通 2D 预览不出现，面板在主屏下方不挡画面。
       2026-11-18 九改：① 交互换三级接法（session 本体 select 为主、controller select
       兜底一、XR 相机注视射线兜底二）+ 250ms 去抖，详见下方交互段注释；② 显隐改
       状态机：进沉浸亮 4 秒后自动消失，低头或捏合召唤，不再一直挂着挡视线；
       ③ 样式：九改先做成透明玻璃板，十改按 Haze 要求再去掉整块底板，改成苹果
       原生 / YouTube 风的三个圆形玻璃钮 + 细进度线，详见 drawXRPanel。
       2026-11-18 十一改（Haze 复验 ?v=15：整体好多了，但控制条太靠下、字和钮又
       模糊还是丑、点的时候要加动画）：① 挪位——不再悬在离人 1.6m 的空中，改由
       placeXRPanel 按当前模式的屏随屏定位：贴在视频下边缘往里 3°、和视频同一个
       距离量级（弧幕 44、影院按屏距 0.88 倍），眼睛不用换焦距、字也清楚一截；
       ② 换脸——画布升 2048×432 + anisotropy 拉满治斜视发糊；布局改苹果原生玻璃
       药丸条（一条贴合内容的玻璃条装下进度+时间+三个居中成组的圆钮，YouTube 式
       布局），布局常量集中在 XR_LAYOUT 一份，画图与命中判定共用，命中改按实际
       区域算（旧 0.74/三分阈值废弃）；③ 动画——点中钮有 220ms 放大回弹+高光闪，
       出现淡入 180ms 带轻微上浮、消失淡出 250ms，详见下方动画段。 */
    /* 布局常量（十一改）：画图（drawXRPanel）和命中判定（xrPanelAct）共用这一份，
       不许两处各写一份数字。坐标系 = 画布像素（2048×432），原点左上、y 向下；
       UV 换算时 v 轴翻转：画布 y = (1 - uv.y) * H。 */
    var XR_LAYOUT = {
      W: 2048, H: 432,
      pill: { x: 64, y: 36, w: 1920, h: 360, r: 60 },
      bar: { x0: 140, x1: 1908, cy: 108, thick: 10, knobR: 16, hitPad: 28 },
      timeY: 168,
      btnY: 272, btnR: 59, btnXs: [724, 1024, 1324], btnHit: 110,
      btnZones: ['back', 'play', 'fwd']
    };
    var xrPanelCanvas = document.createElement('canvas');
    xrPanelCanvas.width = XR_LAYOUT.W; xrPanelCanvas.height = XR_LAYOUT.H;
    var xrPanelCtx = xrPanelCanvas.getContext('2d');
    var xrPanelTex = new THREE.CanvasTexture(xrPanelCanvas);
    /* 斜着看面板时纹理会被压缩采样、字发糊：各向异性过滤拉到设备上限（十一改） */
    if (renderer.capabilities && renderer.capabilities.getMaxAnisotropy) {
      xrPanelTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    var xrPanelMat = new THREE.MeshBasicMaterial({ map: xrPanelTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0 });
    var xrPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 26 / (XR_LAYOUT.W / XR_LAYOUT.H)), /* 26 × ≈5.49，比例与画布一致 */
      xrPanelMat
    );
    xrPanel.visible = false;
    xrPanel.name = 'xrControlPanel';
    scene.add(xrPanel);

    /* ---------- 控制条随屏定位（十一改） ----------
       按当前模式的屏算面板位姿：面板贴在屏下边缘往里收 3° 的角度上、水平正对屏
       中心，lookAt 原点正对用户。弧幕模式的屏是半径 50 的球面一段，下边缘俯仰 =
       -(thetaStart+thetaLength-90°)（theta 从 +Y 量起，下边缘的极角换成俯仰）；
       面板距离取 44（屏半径 50，面板在屏前 6m）。180°/220° 两块屏上下通顶、
       下边缘就是正下方的极点（公式给 -87°），真摆那儿人得低头看脚面——钳到
       -40° 保可用，这两个模式以钳值为准。影院屏是半径 30、高 24 的圆柱面：
       读它几何包围盒的底边 y（-12）和屏距 30 算下边缘俯仰，距离取屏距的 0.88 倍。
       360° 球幕没有下边缘，俯仰 -30°、距离 44 兜底。 */
    var XR_PANEL_DIST = 44;
    var XR_SCREEN_THETA = { /* 各弧幕模式 SphereGeometry 的 thetaStart/thetaLength（度），与 initThree 里建几何时一字不差 */
      immersive: { start: 0, length: 180 }, immersive180: { start: 0, length: 180 },
      immersive70: { start: 70.5, length: 39 }, immersive90: { start: 64.7, length: 50.6 },
      immersive110: { start: 59.1, length: 61.9 }, immersive130: { start: 53.4, length: 73.1 },
      immersive150: { start: 47.8, length: 84.4 },
      stereo: { start: 53.4, length: 73.1 }, ai: { start: 53.4, length: 73.1 }
    };
    var xrPanelBasePos = new THREE.Vector3(0, -28, -34); /* placeXRPanel 的落点，淡入上浮动画以它为归位点 */
    function placeXRPanel() {
      var elevDeg, dist = XR_PANEL_DIST;
      if (mode === 'cinema' && cinemaGroup) {
        var scr = cinemaGroup.children[0];
        var minY = -12, scrDist = 30;
        if (scr && scr.geometry) {
          scr.geometry.computeBoundingBox();
          if (scr.geometry.boundingBox) minY = scr.geometry.boundingBox.min.y;
        }
        elevDeg = Math.atan2(minY, scrDist) * 180 / Math.PI + 3; /* ≈ -21.8° + 3° = -18.8° */
        dist = scrDist * 0.88;
      } else if (mode === 'sphere') {
        elevDeg = -30;
      } else {
        var th = XR_SCREEN_THETA[mode];
        if (th) {
          elevDeg = -(th.start + th.length - 90) + 3;
          if (elevDeg < -40) elevDeg = -40; /* 180/220 下边缘在极点，钳到 -40° */
        } else {
          elevDeg = -33.5; /* 未知模式按 130° 屏兜底 */
        }
      }
      var elev = elevDeg * Math.PI / 180;
      xrPanel.position.set(0, dist * Math.sin(elev), -dist * Math.cos(elev));
      xrPanel.lookAt(0, 0, 0);
      xrPanelBasePos.copy(xrPanel.position);
    }
    placeXRPanel(); /* 默认 immersive 先摆一次，setMode/sessionstart 时再按模式重摆 */
    placeXRPanelFn = placeXRPanel;

    function xrPanelRoundRect(x, y, w, h, r) {
      xrPanelCtx.beginPath();
      xrPanelCtx.moveTo(x + r, y);
      xrPanelCtx.arcTo(x + w, y, x + w, y + h, r);
      xrPanelCtx.arcTo(x + w, y + h, x, y + h, r);
      xrPanelCtx.arcTo(x, y + h, x, y, r);
      xrPanelCtx.arcTo(x, y, x + w, y, r);
      xrPanelCtx.closePath();
    }
    function xrPanelDrawArcBtn(cx, cy, dir) {
      /* YouTube 式弧形回箭头（纯 canvas 路径手绘，不用 emoji/文字字形）：一段约 297°
         的圆弧（顶上留缺口）+ 一端的三角箭头，弧心写小号「10」。dir=-1 快退：箭头
         在左上端点、切线沿逆时针行进方向（朝左下）；dir=+1 快进：箭头在右上端点、
         切线沿顺时针方向（朝右下），与快退正好镜像。弧的点集两边共用同一段：
         arc(…, top-gap, top+gap, true) 按规范扫出 2π-2·gap 的长弧（过左、底、右）。 */
      var r = 27, top = -Math.PI / 2, gap = 0.55;
      xrPanelCtx.beginPath();
      xrPanelCtx.arc(cx, cy, r, top - gap, top + gap, true);
      xrPanelCtx.strokeStyle = '#ffffff'; xrPanelCtx.lineWidth = 8; xrPanelCtx.lineCap = 'round';
      xrPanelCtx.stroke();
      var a = (dir < 0) ? (top - gap) : (top + gap);
      var px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
      var tx = (dir < 0) ? Math.sin(a) : -Math.sin(a);   /* 切线 = 行进方向 */
      var ty = (dir < 0) ? -Math.cos(a) : Math.cos(a);
      var nx = -ty, ny = tx;                            /* 法线 */
      xrPanelCtx.beginPath();
      xrPanelCtx.moveTo(px + tx * 14, py + ty * 14);
      xrPanelCtx.lineTo(px - tx * 5 + nx * 9, py - ty * 5 + ny * 9);
      xrPanelCtx.lineTo(px - tx * 5 - nx * 9, py - ty * 5 - ny * 9);
      xrPanelCtx.closePath();
      xrPanelCtx.fillStyle = '#ffffff';
      xrPanelCtx.fill();
      xrPanelCtx.fillStyle = '#ffffff';
      xrPanelCtx.font = '600 30px sans-serif';
      xrPanelCtx.textAlign = 'center'; xrPanelCtx.textBaseline = 'middle';
      xrPanelCtx.fillText('10', cx, cy + 1);
    }
    /* ---------- 点按动画状态（十一改） ----------
       xrPanelAct 命中执行动作时记下 zone + 时刻，drawXRPanel 按进度给那个钮画
       放大回弹 + 高光闪；淡入/淡出的 opacity 动画状态也放这里，统一由下方状态机
       段的 30ms interval 驱动（没动画时 interval 空转直接返回）。 */
    var xrPressedZone = null, xrPressedAt = 0;
    var xrPanelOpacity = 0;
    var xrFadeAnim = null; /* { from, to, start, dur }，to=1 淡入（带上浮）、to=0 淡出 */
    function xrPressPulse(zone) {
      if (xrPressedZone !== zone || !xrPressedAt) return { s: 1, a: 0 };
      var t = ((window.performance && performance.now) ? performance.now() : Date.now()) - xrPressedAt;
      t = t / 220;
      if (t >= 1 || t < 0) return { s: 1, a: 0 };
      return { s: 1 + 0.15 * Math.sin(Math.PI * t), a: 0.25 * (1 - t) };
    }
    function drawXRPanel() {
      var L = XR_LAYOUT, W = L.W, H = L.H;
      var dur = video.duration, cur = video.currentTime || 0;
      var hasDur = isFinite(dur) && dur > 0;
      var frac = hasDur ? Math.max(0, Math.min(1, cur / dur)) : 0;
      /* 苹果原生玻璃条 + YouTube 布局（2026-11-18 十一改，Haze 嫌十改的散钮还是
         丑、又模糊）：一条贴合内容的玻璃药丸装下全部控件——上方细进度线（YouTube
         味：细轨 + 白滑块点）、中间小号时间、下方三个圆钮居中成组（不再摊满
         三等分）。画布 2048×432（十改是 1024×216，分辨率翻倍治模糊）+ 纹理
         anisotropy 拉满。布局数字全部取自 XR_LAYOUT，命中判定（xrPanelAct）
         用同一份常量按实际区域算——进度带按进度线实际跨度映射、按钮按圆心
         ±110px 方区，药丸外和区域外点中不动作（十改的 0.74/三分阈值已废弃）。 */
      xrPanelCtx.clearRect(0, 0, W, H);
      /* 玻璃药丸：深色半透明底 + 自上而下的淡白色渐变高光 + 细白描边，药丸外全透明 */
      var pill = L.pill;
      xrPanelRoundRect(pill.x, pill.y, pill.w, pill.h, pill.r);
      xrPanelCtx.fillStyle = 'rgba(28, 28, 42, 0.35)';
      xrPanelCtx.fill();
      var grad = xrPanelCtx.createLinearGradient(0, pill.y, 0, pill.y + pill.h);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.09)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      xrPanelRoundRect(pill.x, pill.y, pill.w, pill.h, pill.r);
      xrPanelCtx.fillStyle = grad;
      xrPanelCtx.fill();
      xrPanelRoundRect(pill.x, pill.y, pill.w, pill.h, pill.r);
      xrPanelCtx.strokeStyle = 'rgba(255, 255, 255, 0.22)'; xrPanelCtx.lineWidth = 1.5;
      xrPanelCtx.stroke();
      /* 进度线（药丸内上方，x 140–1908、中心 y 108；轨道 10px 圆角） */
      var bar = L.bar, span = bar.x1 - bar.x0;
      xrPanelCtx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      xrPanelRoundRect(bar.x0, bar.cy - bar.thick / 2, span, bar.thick, bar.thick / 2); xrPanelCtx.fill();
      if (hasDur) {
        if (frac > 0) {
          xrPanelCtx.fillStyle = '#ffffff';
          xrPanelRoundRect(bar.x0, bar.cy - bar.thick / 2, Math.max(bar.thick, span * frac), bar.thick, bar.thick / 2); xrPanelCtx.fill();
        }
        /* 滑块圆点：点进度时和按钮一样有放大脉冲（zone='seek'） */
        var seekPulse = xrPressPulse('seek');
        xrPanelCtx.beginPath();
        xrPanelCtx.arc(bar.x0 + span * frac, bar.cy, bar.knobR * seekPulse.s, 0, Math.PI * 2);
        xrPanelCtx.fillStyle = '#ffffff';
        xrPanelCtx.shadowColor = 'rgba(0, 0, 0, 0.30)'; xrPanelCtx.shadowBlur = 8;
        xrPanelCtx.fill();
        xrPanelCtx.shadowColor = 'transparent'; xrPanelCtx.shadowBlur = 0;
        if (seekPulse.a > 0) {
          xrPanelCtx.beginPath();
          xrPanelCtx.arc(bar.x0 + span * frac, bar.cy, bar.knobR * seekPulse.s, 0, Math.PI * 2);
          xrPanelCtx.fillStyle = 'rgba(255, 255, 255, ' + seekPulse.a.toFixed(3) + ')';
          xrPanelCtx.fill();
        }
      }
      /* 时间文字（进度线下方居中，小号半透明白） */
      xrPanelCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      xrPanelCtx.font = '400 30px sans-serif';
      xrPanelCtx.textAlign = 'center'; xrPanelCtx.textBaseline = 'middle';
      xrPanelCtx.fillText(fmt(cur) + ' / ' + (hasDur ? fmt(dur) : '--:--'), W / 2, L.timeY);
      /* 三个圆形玻璃钮（居中成组；被点的那个按脉冲放大 + 高光闪） */
      for (var i = 0; i < 3; i++) {
        var bx = L.btnXs[i], by = L.btnY;
        var pulse = xrPressPulse(L.btnZones[i]);
        var br = L.btnR * pulse.s;
        xrPanelCtx.beginPath();
        xrPanelCtx.arc(bx, by, br, 0, Math.PI * 2);
        xrPanelCtx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        xrPanelCtx.shadowColor = 'rgba(0, 0, 0, 0.20)'; xrPanelCtx.shadowBlur = 16; xrPanelCtx.shadowOffsetY = 3;
        xrPanelCtx.fill();
        xrPanelCtx.shadowColor = 'transparent'; xrPanelCtx.shadowBlur = 0; xrPanelCtx.shadowOffsetY = 0;
        if (pulse.a > 0) {
          xrPanelCtx.beginPath();
          xrPanelCtx.arc(bx, by, br, 0, Math.PI * 2);
          xrPanelCtx.fillStyle = 'rgba(255, 255, 255, ' + pulse.a.toFixed(3) + ')';
          xrPanelCtx.fill();
        }
        xrPanelCtx.beginPath();
        xrPanelCtx.arc(bx, by, br, 0, Math.PI * 2);
        xrPanelCtx.strokeStyle = 'rgba(255, 255, 255, 0.30)'; xrPanelCtx.lineWidth = 1.5;
        xrPanelCtx.stroke();
        /* 图标跟钮一起缩放：以钮心为原点缩放后在 (0,0) 处画 */
        xrPanelCtx.save();
        xrPanelCtx.translate(bx, by);
        xrPanelCtx.scale(pulse.s, pulse.s);
        xrPanelCtx.shadowColor = 'rgba(0, 0, 0, 0.30)'; xrPanelCtx.shadowBlur = 8;
        if (i === 0) xrPanelDrawArcBtn(0, 0, -1);      /* 左钮：快退 10 秒 */
        else if (i === 2) xrPanelDrawArcBtn(0, 0, 1);  /* 右钮：快进 10 秒 */
        else if (video.paused) {
          /* 播放：白色实心右三角，边角微圆（同色描边 + round join 柔化） */
          xrPanelCtx.beginPath();
          xrPanelCtx.moveTo(-13, -19);
          xrPanelCtx.lineTo(-13, 19);
          xrPanelCtx.lineTo(19, 0);
          xrPanelCtx.closePath();
          xrPanelCtx.fillStyle = '#ffffff';
          xrPanelCtx.fill();
          xrPanelCtx.strokeStyle = '#ffffff'; xrPanelCtx.lineWidth = 5; xrPanelCtx.lineJoin = 'round';
          xrPanelCtx.stroke();
        } else {
          /* 暂停：两条白色圆角竖条 */
          xrPanelCtx.fillStyle = '#ffffff';
          xrPanelRoundRect(-18, -18, 12, 36, 5); xrPanelCtx.fill();
          xrPanelRoundRect(6, -18, 12, 36, 5); xrPanelCtx.fill();
        }
        xrPanelCtx.restore();
      }
      xrPanelCtx.shadowColor = 'transparent'; xrPanelCtx.shadowBlur = 0;
      xrPanelTex.needsUpdate = true;
    }
    drawXRPanel();

    /* ---------- 控制条交互 + 显隐状态机（2026-11-18 九改） ----------
       八改时点了不管用：handler 只挂在 renderer.xr.getController(0/1) 的 'select' 上，
       visionOS 的捏合是 transient-pointer 输入源，three 的 controller 映射未必给这类
       输入源派发 select，事件可能根本到不了 handler。九改换三级接法（先命中先算）：
       ① 主接法：XRSession 本体的 'select'（sessionstart 时从 renderer.xr.getSession()
          拿到、每个 session 只绑一次），用 event.frame.getPose(输入源 targetRaySpace,
          参考系) 取 targetRay 射线——这条不经过 three 的 controller 映射，系统派发
          给 session 的 select 一定收得到；
       ② 兜底一：原 controller 'select'（其他设备/浏览器可能走这条，原样保留）；
       ③ 兜底二：session 射线取不到 pose 或没交点时，用 XR 相机的注视射线（visionOS
          是「注视 + 捏合」，注视方向就是他正看的地方）。
       同一个捏合可能在 session 级和 controller 级各触发一次：统一入口 xrHandleSelect
       先过 250ms 去抖，窗口内的重复触发直接丢弃，别 seek 两次、开关切两次。
       显隐状态机：presenting 期间分 shown/hidden 两态——sessionstart 进 shown 并起
       4 秒计时，4 秒内无成功交互就自动 hidden（不再一直挂着挡视线）；hidden 时低头
       （相机注视方向 y < -0.42，约低头 25° 以上，十一改随面板挪位放深）或任意一级
       接法来一次 select 都能召唤回 shown，但召唤的那次 select 只亮面板、不执行
       动作。十一改另给 show/hide 加了淡入淡出动画，见 xrStartFade 一段。旧的 500ms
       「visible = presenting」强制对齐会把刚藏起的面板又顶亮，跟自动消失打架，已废。 */
    var xrRaycaster = new THREE.Raycaster();
    var xrTempMatrix = new THREE.Matrix4();
    var xrPanelShown = false;
    var xrPanelHideTimer = null;
    var xrLastSelectAt = 0;
    function xrNow() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
    /* 出现/消失动画（十一改）：show 走 180ms 淡入（opacity 0→1，带沿面板自身
       上方向 0.3 的轻微上浮归位），4 秒计时到点走 250ms 淡出、淡完才置
       visible=false；淡出途中来召唤/交互，xrPanelShow 直接从中途 opacity
       反向淡入回 shown。sessionend 和退出 presenting 是硬收（立即隐藏），
       不走淡出——会话都没了，淡出没人看得到。 */
    function xrStartFade(to, dur) {
      xrFadeAnim = { from: xrPanelOpacity, to: to, start: xrNow(), dur: dur };
    }
    function xrPanelShow() {
      xrPanelShown = true;
      xrPanel.visible = true;
      xrStartFade(1, 180);
      drawXRPanel();
      xrPanelResetHideTimer();
    }
    function xrPanelBeginHide() {
      if (!xrPanelShown) return;
      xrPanelShown = false;
      if (xrPanelHideTimer) { clearTimeout(xrPanelHideTimer); xrPanelHideTimer = null; }
      xrStartFade(0, 250);
    }
    function xrPanelHardHide() {
      xrPanelShown = false;
      xrFadeAnim = null;
      xrPanelOpacity = 0;
      xrPanel.material.opacity = 0;
      xrPanel.visible = false;
      if (xrPanelHideTimer) { clearTimeout(xrPanelHideTimer); xrPanelHideTimer = null; }
    }
    function xrPanelResetHideTimer() {
      if (xrPanelHideTimer) clearTimeout(xrPanelHideTimer);
      xrPanelHideTimer = setTimeout(function () { xrPanelBeginHide(); }, 4000);
    }
    /* 动画驱动（30ms）：只在有动画时干活，没动画第一行就返回，不常驻重绘。
       淡入/淡出推进 opacity（+淡入的上浮偏移）；点按脉冲在进行中就重绘面板，
       脉冲结束补最后一帧把钮画回原尺寸。 */
    var xrFadeUpVec = new THREE.Vector3();
    setInterval(function () {
      if (!xrFadeAnim && !xrPressedZone) return;
      var now = xrNow();
      if (xrFadeAnim) {
        var ft = Math.min(1, (now - xrFadeAnim.start) / xrFadeAnim.dur);
        var fe = 1 - Math.pow(1 - ft, 3); /* ease-out */
        xrPanelOpacity = xrFadeAnim.from + (xrFadeAnim.to - xrFadeAnim.from) * fe;
        xrPanel.material.opacity = xrPanelOpacity;
        if (xrFadeAnim.to === 1) {
          xrFadeUpVec.set(0, 1, 0).applyQuaternion(xrPanel.quaternion);
          xrPanel.position.copy(xrPanelBasePos).addScaledVector(xrFadeUpVec, -0.3 * (1 - fe));
        }
        if (ft >= 1) {
          if (xrFadeAnim.to === 0) xrPanel.visible = false;
          xrPanel.position.copy(xrPanelBasePos);
          xrFadeAnim = null;
        }
      }
      if (xrPressedZone) {
        if (now - xrPressedAt < 240) { if (xrPanel.visible) drawXRPanel(); }
        else { xrPressedZone = null; if (xrPanel.visible) drawXRPanel(); }
      }
    }, 30);
    function xrPanelRaycastUV(origin, dir) {
      xrRaycaster.ray.origin.copy(origin);
      xrRaycaster.ray.direction.copy(dir);
      var hits = xrRaycaster.intersectObject(xrPanel, false);
      if (!hits.length || !hits[0].uv) return null;
      return hits[0].uv;
    }
    function xrPanelAct(uv) {
      /* 命中映射（2026-11-18 十一改换新，旧的 v>0.74/按 u 三分阈值废弃）：UV 先
         换算成画布坐标（v 轴翻转：画布 y = (1-uv.y)*H），再按 XR_LAYOUT 的实际
         区域判定，画图与判定共用同一份常量——进度命中带 = 进度线 y 带上下各扩
         hitPad(28px)，x 只认进度线实际跨度 140–1908、按跨度比例 seek（不再是
         全宽比例）；按钮命中 = 各圆钮圆心 ±110px 方区（比画出来的钮大一圈，
         好捏中）；药丸内其他区域和药丸外点中都不动作。命中执行时记下 zone，
         drawXRPanel 给那个钮画 220ms 放大回弹 + 高光闪（点按动画，十一改）。 */
      var L = XR_LAYOUT;
      var cx = uv.x * L.W, cy = (1 - uv.y) * L.H;
      var dur = video.duration, hasDur = isFinite(dur) && dur > 0;
      var zone = null;
      var barTop = L.bar.cy - L.bar.thick / 2 - L.bar.hitPad;
      var barBot = L.bar.cy + L.bar.thick / 2 + L.bar.hitPad;
      if (cy >= barTop && cy <= barBot) {
        if (cx >= L.bar.x0 && cx <= L.bar.x1) {
          if (hasDur) video.currentTime = ((cx - L.bar.x0) / (L.bar.x1 - L.bar.x0)) * dur;
          zone = 'seek';
        }
      } else {
        for (var i = 0; i < 3; i++) {
          if (Math.abs(cx - L.btnXs[i]) <= L.btnHit && Math.abs(cy - L.btnY) <= L.btnHit) {
            zone = L.btnZones[i];
            if (i === 0) {
              video.currentTime = Math.max(0, (video.currentTime || 0) - 10);
            } else if (i === 1) {
              if (video.paused) { video.play().catch(function () {}); }
              else { video.pause(); }
            } else {
              var nt = (video.currentTime || 0) + 10;
              video.currentTime = hasDur ? Math.min(dur, nt) : nt;
            }
            break;
          }
        }
      }
      if (zone) { xrPressedZone = zone; xrPressedAt = xrNow(); }
      drawXRPanel(); /* 动作完立刻重绘，进度/播放态马上跟上（点按动画首帧也在这） */
    }
    function xrGazeRay() {
      /* XR 相机的注视射线：原点在相机位置、方向是相机正前方 */
      try {
        var xrCam = renderer.xr.getCamera(camera);
        var origin = new THREE.Vector3();
        xrCam.getWorldPosition(origin);
        var dir = new THREE.Vector3();
        xrCam.getWorldDirection(dir);
        if (dir.lengthSq() > 0) return { origin: origin, dir: dir };
      } catch (err) {}
      return null;
    }
    function xrHandleSelect(rays) {
      var now = (window.performance && performance.now) ? performance.now() : Date.now();
      if (now - xrLastSelectAt < 250) return; /* 去抖：同一捏合的重复触发直接丢弃 */
      xrLastSelectAt = now;
      if (!xrPanelShown) { xrPanelShow(); return; } /* 隐藏时捏合只召唤，不执行动作 */
      for (var i = 0; i < rays.length; i++) {
        if (!rays[i]) continue;
        var uv = xrPanelRaycastUV(rays[i].origin, rays[i].dir);
        if (uv) { xrPanelAct(uv); xrPanelResetHideTimer(); return; }
      }
    }
    function onXRControllerSelect(event) {
      var controller = event.target;
      /* controller 的 matrixWorld 就是 targetRay：原点在射线起点、-Z 是射线方向
         （three WebXRManager 的标准约定，官方示例同款写法） */
      xrTempMatrix.identity().extractRotation(controller.matrixWorld);
      var origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
      var dir = new THREE.Vector3(0, 0, -1).applyMatrix4(xrTempMatrix);
      xrHandleSelect([{ origin: origin, dir: dir }]);
    }
    function onXRSessionSelect(event) {
      var rays = [];
      try {
        var refSpace = renderer.xr.getReferenceSpace && renderer.xr.getReferenceSpace();
        var pose = (event.frame && event.frame.getPose && event.inputSource && event.inputSource.targetRaySpace && refSpace)
          ? event.frame.getPose(event.inputSource.targetRaySpace, refSpace) : null;
        if (pose) {
          var t = pose.transform;
          var q = new THREE.Quaternion(t.orientation.x, t.orientation.y, t.orientation.z, t.orientation.w);
          rays.push({
            origin: new THREE.Vector3(t.position.x, t.position.y, t.position.z),
            dir: new THREE.Vector3(0, 0, -1).applyQuaternion(q)
          });
        }
      } catch (err) {}
      var gaze = xrGazeRay();
      if (gaze) rays.push(gaze); /* 兜底二：targetRay 没交点时按注视方向再试一次 */
      xrHandleSelect(rays);
    }
    if (renderer.xr && renderer.xr.getController) {
      var xrCtrl0 = renderer.xr.getController(0);
      var xrCtrl1 = renderer.xr.getController(1);
      xrCtrl0.addEventListener('select', onXRControllerSelect);
      xrCtrl1.addEventListener('select', onXRControllerSelect);
      scene.add(xrCtrl0);
      scene.add(xrCtrl1);
    }
    if (renderer.xr && renderer.xr.addEventListener) {
      renderer.xr.addEventListener('sessionstart', function () {
        /* 主接法绑在 XRSession 本体上：每个 session 只绑一次 */
        try {
          var sess = renderer.xr.getSession && renderer.xr.getSession();
          if (sess && !sess.__xrPanelSelectBound) {
            sess.__xrPanelSelectBound = true;
            sess.addEventListener('select', onXRSessionSelect);
          }
        } catch (err) {}
        placeXRPanel(); /* 进沉浸先按当前模式的屏把控制条摆到视频底部（十一改） */
        xrPanelShow();
      });
      renderer.xr.addEventListener('sessionend', function () { xrPanelHardHide(); });
    }
    /* 状态机 tick（500ms）：不 presenting 强制 hidden（硬收）；shown 时刷新进度；
       hidden 时检测低头召唤（相机注视方向 y < -0.42 ≈ 低头 25° 以上，十一改随
       面板挪到视频底部把阈值从 -0.38 放深一点，让视线落向视频底部前条就出来） */
    setInterval(function () {
      if (!renderer || !renderer.xr) return;
      var presenting = !!renderer.xr.isPresenting;
      if (!presenting) { if (xrPanelShown || xrPanel.visible || xrFadeAnim) xrPanelHardHide(); return; }
      if (xrPanelShown) { drawXRPanel(); return; }
      var gaze = xrGazeRay();
      if (gaze && gaze.dir.y < -0.42) xrPanelShow();
    }, 500);

    /* 影院：前方一块大曲面屏（圆柱面的一段，约 92° 宽，16:9 比例），内侧看画面会左右镜像，所以纹理单独翻转一次 */
    cinemaGroup = new THREE.Group();
    var screenGeo = new THREE.CylinderGeometry(30, 30, 24, 64, 1, true, Math.PI - 0.8, 1.6);
    var screenMat = new THREE.MeshBasicMaterial({ map: makeVideoTexture(true), side: THREE.BackSide });
    var screen = new THREE.Mesh(screenGeo, screenMat);
    cinemaGroup.add(screen);
    cinemaGroup.add(makeStars(900, 70));
    cinemaGroup.visible = false;
    scene.add(cinemaGroup);

    /* 拖动看四周（鼠标和触屏都行） */
    var dragging = false, lastX = 0, lastY = 0;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      /* 灵敏度 2026-11-18 调低一档（0.0035 → 0.0022）：VP 上用手拖动时指针位移又大又抖，
         原灵敏度下屏幕来回跑、很难停在正中间。拖动是严格跟手、没有惯性/动量：松手那一刻
         yaw/pitch 就定死，渲染循环直接用这两个值，不存在松手后继续滑行。 */
      yaw -= dx * 0.0022;
      pitch -= dy * 0.0022;
      pitch = Math.max(-1.45, Math.min(1.45, pitch));
      /* 220° 模式下身后是空的，转过去没东西看，所以左右转动限制在 ±115° 内；
         180° 模式画面只盖正前方 180°，限制在 ±90° 内，别转到屏幕边缘外面去；
         70° 模式屏只有 70° 宽、39° 高，左右限制在 ±35°、上下限制在 ±20° 内；
         90°/110°/130°/150° 模式同理，左右限制在 ±宽度/2、上下限制在 ±高度/2 内（90° ±45°/±25°、110° ±55°/±31°、130° ±65°/±37°、150° ±75°/±42°）；360° 和影院模式不限制；
         3D 立体模式的屏 2026-11-18 九改放大到 130° 弧幕（和 AI 一样大），限幅跟 130° 沉浸/AI 走（±65°/±37°）；
         AI 模式的屏 2026-11-18 二改成 130° 弧幕（110° 能看但嫌小），限幅跟 130° 沉浸走（±65°/±37°） */
      if (mode === 'immersive') yaw = Math.max(-2.0, Math.min(2.0, yaw));
      else if (mode === 'immersive180') yaw = Math.max(-1.5, Math.min(1.5, yaw));
      else if (mode === 'stereo') {
        yaw = Math.max(-1.13, Math.min(1.13, yaw));
        pitch = Math.max(-0.64, Math.min(0.64, pitch));
      }
      else if (mode === 'ai') {
        yaw = Math.max(-1.13, Math.min(1.13, yaw));
        pitch = Math.max(-0.64, Math.min(0.64, pitch));
      }
      else if (mode === 'immersive70') {
        yaw = Math.max(-0.61, Math.min(0.61, yaw));
        pitch = Math.max(-0.35, Math.min(0.35, pitch));
      }
      else if (mode === 'immersive90') {
        yaw = Math.max(-0.79, Math.min(0.79, yaw));
        pitch = Math.max(-0.44, Math.min(0.44, pitch));
      }
      else if (mode === 'immersive110') {
        yaw = Math.max(-0.96, Math.min(0.96, yaw));
        pitch = Math.max(-0.54, Math.min(0.54, pitch));
      }
      else if (mode === 'immersive130') {
        yaw = Math.max(-1.13, Math.min(1.13, yaw));
        pitch = Math.max(-0.64, Math.min(0.64, pitch));
      }
      else if (mode === 'immersive150') {
        yaw = Math.max(-1.31, Math.min(1.31, yaw));
        pitch = Math.max(-0.73, Math.min(0.73, pitch));
      }
    });
    function endDrag() { dragging = false; }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    function resize() {
      var w = player.clientWidth, h = player.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resizeThree = resize;
    window.addEventListener('resize', resize);
    resize();

    function loop() {
      requestAnimationFrame(loop);
      /* 沉浸模式下由 WebXR 的 animation loop 渲染，这里跳过，避免重复渲染 */
      if (renderer.xr && renderer.xr.isPresenting) return;
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
      renderer.render(scene, camera);
      window.__aiRenderCount = (window.__aiRenderCount || 0) + 1; /* AI 状态行读它报渲染帧率 */
    }
    loop();
  }

  function setMode(m) {
    if (!renderer) return;
    mode = m;
    immersiveMesh.visible = (m === 'immersive');
    immersive180Mesh.visible = (m === 'immersive180');
    immersive70Mesh.visible = (m === 'immersive70');
    immersive90Mesh.visible = (m === 'immersive90');
    immersive110Mesh.visible = (m === 'immersive110');
    immersive130Mesh.visible = (m === 'immersive130');
    immersive150Mesh.visible = (m === 'immersive150');
    sphereMesh.visible = (m === 'sphere');
    cinemaGroup.visible = (m === 'cinema');
    applyStereoEyes(); /* 3D 模式下左右眼屏的显隐和图层由它按是否沉浸统一管 */
    applyAiEyes(); /* AI 模式下三块屏的显隐和图层同理 */
    if (placeXRPanelFn) placeXRPanelFn(); /* 沉浸控制条随当前模式的屏重摆到视频底部（十一改） */
    /* 2D 原格式：藏起 3D 画布，直接显示 video 元素平铺播放（原比例、黑边留白，不拉伸）；
       切回其他模式时恢复画布、藏起 video。FOV 在 2D 模式下不起作用，保持原值不动。 */
    canvas.style.display = (m === '2d') ? 'none' : '';
    video.classList.toggle('show-2d', m === '2d');
    scene.background = (m === 'cinema') ? makeBackgroundTexture() : null;
    modeImmersiveBtn.classList.toggle('active', m === 'immersive');
    modeImmersive180Btn.classList.toggle('active', m === 'immersive180');
    modeImmersive70Btn.classList.toggle('active', m === 'immersive70');
    modeImmersive90Btn.classList.toggle('active', m === 'immersive90');
    modeImmersive110Btn.classList.toggle('active', m === 'immersive110');
    modeImmersive130Btn.classList.toggle('active', m === 'immersive130');
    modeImmersive150Btn.classList.toggle('active', m === 'immersive150');
    modeSphereBtn.classList.toggle('active', m === 'sphere');
    modeCinemaBtn.classList.toggle('active', m === 'cinema');
    modeStereoBtn.classList.toggle('active', m === 'stereo');
    modeAiBtn.classList.toggle('active', m === 'ai');
    mode2dBtn.classList.toggle('active', m === '2d');
    /* 220°/180°/70°/90°/110°/130°/150° 沉浸和 360° 球幕视角放宽到 90°，一眼看到的画面更多、包围感更强；
       影院模式保持 75° 不动，避免曲面屏边缘拉伸 */
    camera.fov = (m === 'cinema') ? 75 : 90;
    camera.updateProjectionMatrix();
    yaw = 0; pitch = 0;
    /* AI 模式：进来就懒加载模型并开跑流水线；离开就停流水线（模型留在内存里，下次进来秒开）。
       aiEnterMode 加 try/catch：万一同步抛错，错误写进 AI 设置行并给重试按钮，
       绝不让一次抛错把「点了 AI 没反应/模式像消失了」这种哑巴亏再发生 */
    if (m === 'ai') {
      try { aiEnterMode(); } catch (err) {
        aiSetStatus('AI 启动出错：' + (err && err.message ? err.message : String(err)) + '。点「🔁 重新加载 AI」再试。');
        if (aiRetryBtn) aiRetryBtn.hidden = false;
      }
    } else { aiStopLoop(); }
  }
  modeImmersiveBtn.addEventListener('click', function () { setMode('immersive'); });
  modeImmersive180Btn.addEventListener('click', function () { setMode('immersive180'); });
  modeImmersive70Btn.addEventListener('click', function () { setMode('immersive70'); });
  modeImmersive90Btn.addEventListener('click', function () { setMode('immersive90'); });
  modeImmersive110Btn.addEventListener('click', function () { setMode('immersive110'); });
  modeImmersive130Btn.addEventListener('click', function () { setMode('immersive130'); });
  modeImmersive150Btn.addEventListener('click', function () { setMode('immersive150'); });
  modeSphereBtn.addEventListener('click', function () { setMode('sphere'); });
  modeCinemaBtn.addEventListener('click', function () { setMode('cinema'); });
  modeStereoBtn.addEventListener('click', function () {
    setMode('stereo');
    setStatus('3D 立体模式：现在看到的是左眼画面。戴上 Vision Pro 点「🥽 进入沉浸模式」，左右眼分别看各自半幅，才是真立体。源格式猜错了（画面对不上）就在上方手动选 SBS / OU；看着晕，就拖上方「🎚 立体强弱」滑杆往左滑（默认已弱 35%），滑到画面变平就是 2D、肯定不晕；想要更强往右滑；远近反了再勾「🔀 交换左右眼」。');
  });
  modeAiBtn.addEventListener('click', function () {
    if (aiSettings) aiSettings.hidden = false; /* 先把 AI 设置行亮出来：加载进度、报错、重试按钮都在这行里，点了 AI 就一定有反馈 */
    setMode('ai');
    if (aiState === 'ready') {
      setStatus('AI 转 3D：现在是左右并排预览（左=原图、右=AI 合成）。戴上 Vision Pro 点「🥽 进入沉浸模式」，左右眼各看一块屏，才是真立体。立体感不够就拉大视差强度。');
    } else if (aiState === 'failed') {
      setStatus('AI 转 3D 正在重试加载模型，看模式下方的状态行进度。');
    } else {
      setStatus('AI 转 3D 正在加载深度模型（首次约 50MB，看模式下方的状态行进度），下完自动开始转。视频全程只在本机处理，不上传。');
    }
  });
  if (aiRetryBtn) aiRetryBtn.addEventListener('click', function () {
    aiRetryBtn.hidden = true;
    aiState = 'idle';
    aiLoadModel(); /* 从头加载：库 + 模型 + 热身整条链重跑 */
    setStatus('正在重新加载 AI 深度模型，看 AI 设置行的状态进度。');
  });
  if (aiParallax) aiParallax.addEventListener('input', function () {
    aiParallaxPct = parseFloat(aiParallax.value) || 0;
    if (aiParallaxVal) aiParallaxVal.textContent = aiParallaxPct.toFixed(1) + '%';
  });
  mode2dBtn.addEventListener('click', function () { setMode('2d'); });
  /* 站内 3D 演示片（2026-11-18 五改）：离线工具转出来的 SBS 样片（站点根目录
     demo-3d-sbs.mp4），已实测垂直错位≈0、视差弱——一份保证对的立体测试源。
     点它：停 2D 演示、切源、格式强制 SBS、known3d 置 true（警告随之消失）；
     15 秒短片循环播，方便反复试滑杆/交换。按钮就在立体设置行里，进了立体模式才看得见 */
  if (demo3dBtn) demo3dBtn.addEventListener('click', function () {
    stopDemo(); /* 在播 2D 演示就先停掉（demoActive 置 false、画布收起） */
    video.muted = false;
    video.volume = volume.value / 100;
    currentFileName = 'demo-3d-sbs.mp4';
    known3d = true;
    video.loop = true;
    video.src = 'demo-3d-sbs.mp4';
    video.load();
    stereoChoice = 'sbs'; /* 格式强制 SBS：下拉框同步选上，免得「自动」再去猜 */
    if (stereoFormatSel) stereoFormatSel.value = 'sbs';
    applyStereoFormat();
    updateStereoWarning();
    fileName.textContent = '站内 3D 演示片（左右版 SBS）· 循环播放中';
    dropHint.hidden = true;
    setStatus('已切换到站内 3D 演示片（真 3D · 左右并排 SBS，已实测画面对齐、视差弱）。点「🥽 进入沉浸模式」看真立体；测立体就用这份保证对的源，别再拿 2D 演示测——那怎么调都晕。');
    video.play().catch(function () {
      setStatus('站内 3D 演示片已加载，浏览器拦了自动播放，点一下「播放」。');
    });
  });
  if (stereoFormatSel) stereoFormatSel.addEventListener('change', function () {
    stereoChoice = stereoFormatSel.value;
    applyStereoFormat();
    setStatus('3D 源格式已按 ' + (stereoResolved === 'sbs' ? 'SBS（左右并排）' : 'OU（上下并排）') + ' 采样。');
  });
  if (stereoSwapChk) stereoSwapChk.addEventListener('change', function () {
    stereoSwap = stereoSwapChk.checked;
    applyStereoFormat();
    setStatus(stereoSwap
      ? '已交换左右眼：左眼改看另一半画面。沉浸里再看一眼，还难受就把勾去掉换回来。'
      : '已恢复默认左右眼（左眼看左/上半幅）。');
  });
  if (stereoStrengthEl) stereoStrengthEl.addEventListener('input', function () {
    stereoShift = (parseFloat(stereoStrengthEl.value) || 0) / 100;
    if (stereoStrengthVal) stereoStrengthVal.textContent = stereoShiftText();
    applyStereoFormat(); /* 采样窗即时平移，拖动滑杆立体强弱立刻变 */
  });
  if (stereoStrengthEl) stereoStrengthEl.addEventListener('change', function () {
    setStatus('立体强弱已调到「' + stereoShiftText() + '」：晕就继续往左滑，滑到画面变平就是纯 2D、肯定不晕了（再往左会反着凸，别滑过头）；想要立体感再往右加。');
  });
  /* 回到正中：yaw/pitch 立即归零，不用一点点拖回来（stereo/ai/沉浸各模式共用同一对角度） */
  if (centerBtn) centerBtn.addEventListener('click', function () {
    yaw = 0; pitch = 0;
    setStatus('视角已回到正中。');
  });

  /* 演示走 2D 退路时，画布盖在播放器上：点任意模式按钮或点播放器就撤下它，
     露出 3D 画面（没选文件时是黑的）加选文件提示，别让演示挡住模式切换 */
  var modeSwitchEl = document.querySelector('.mode-switch');
  if (modeSwitchEl) modeSwitchEl.addEventListener('click', dismissDemoFallback);
  player.addEventListener('click', dismissDemoFallback);

  /* ---------- WebXR：只在支持的浏览器上出现按钮 ---------- */
  function initXR() {
    if (!('xr' in navigator) || !navigator.xr || !navigator.xr.isSessionSupported) return;
    navigator.xr.isSessionSupported('immersive-vr').then(function (supported) {
      if (supported && renderer) { xrBtn.hidden = false; if (xrNote) xrNote.hidden = false; }
    }).catch(function () {});
  }
  xrBtn.addEventListener('click', function () {
    if (!renderer) return;
    setStatus('正在请求沉浸模式…');
    navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] }).then(function (session) {
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType('local');
      renderer.xr.setSession(session).then(function () {
        setStatus('已进入沉浸模式。⚠️ VR 里网页按钮一律不显示（这是头显系统的限制，网页里没有任何退出按钮）——退出请按头显顶部按钮/数码旋钮回系统界面。');
        xrRecenterPending = true; xrRecenterTries = 0; /* 第一帧 XR 渲染时回正，见 xrTryRecenter */
        renderer.setAnimationLoop(function (time, frame) {
          if (xrRecenterPending) xrTryRecenter(frame);
          renderer.render(scene, camera);
        });
      });
      session.addEventListener('end', function () {
        xrRecenterPending = false;
        renderer.setAnimationLoop(null);
        applyStereoEyes(); /* 退出沉浸：3D 模式恢复成左眼预览（renderer.xr 的 sessionend 也会再调一次，重复调用无副作用） */
        applyAiEyes(); /* AI 模式同理：退出沉浸恢复成左右并排预览 */
        setStatus('已退出沉浸模式。');
      });
    }).catch(function (err) {
      setStatus('进不去沉浸模式：' + (err && err.message ? err.message : '被拒绝或不支持'));
    });
  });

  /* ---------- 启动 ---------- */
  if (!threeOK) {
    enable2DFallback('three.js 没加载出来，现在只能用普通 2D 播放，球幕和影院模式不可用。请刷新页面再试一次。');
  } else {
    try {
      initThree();
      initXR();
    } catch (err) {
      enable2DFallback('WebGL 初始化失败（' + (err && err.message ? err.message : '未知错误') + '）。现在只能用普通 2D 播放。');
    }
  }
  updatePlayBtn();
  startDemo(); /* 打开就有演示画面在播，不再是空播放器 */
})();
