(function () {
  var STATE_KEY = 'xt-live2d-state'
  var WIDTH = 200
  var HEIGHT = 400
  var helper = window.__xtLive2DHelper || {}
  var messages = [
    '你好呀，欢迎来到小唐的博客。',
    '需要我帮你介绍一下这里的内容吗？',
    '今天也要加油哦。',
    '喜欢的话记得收藏这个博客。',
    '记得多喝水，也别久坐。',
    '有技术问题尽管来找我。',
    '代码改变世界，也改变今天的你。',
    '嘿嘿，被你发现啦。'
  ]

  if (helper.initialized) {
    helper.refresh()
    return
  }

  var state = loadState()
  var bubble = null
  var controls = null
  var toggle = null
  var canvas = null
  var hideTimer = null
  var checkTimer = null
  var resizeBound = false
  var LEFT = 20
  var BOTTOM = 0

  function loadState() {
    try {
      var raw = window.localStorage.getItem(STATE_KEY)
      if (!raw) return { hidden: false }
      var saved = JSON.parse(raw)
      return { hidden: Boolean(saved.hidden) }
    } catch (error) {
      return { hidden: false }
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STATE_KEY, JSON.stringify({ hidden: state.hidden }))
    } catch (error) {}
  }





  function ensureStyle() {
    if (document.getElementById('live2d-helper-style')) return
    var style = document.createElement('style')
    style.id = 'live2d-helper-style'
    style.textContent = [
      '#live2d-talk{position:fixed;max-width:220px;padding:10px 14px;background:rgba(255,255,255,0.96);border:2px solid #ff69b4;border-radius:14px;font-size:14px;color:#333;line-height:1.6;opacity:0;transition:opacity .3s;z-index:1000000;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.15);font-weight:500;}',
      '#live2d-controls{position:fixed;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:999px;background:rgba(255,255,255,.94);box-shadow:0 10px 30px rgba(0,0,0,.15);z-index:1000000;backdrop-filter:blur(8px);}',
      '#live2d-controls button{border:0;background:#0f766e;color:#fff;padding:6px 10px;border-radius:999px;font-size:12px;line-height:1;cursor:pointer;}',

      '#live2d-toggle{position:fixed;border:0;background:#111827;color:#fff;padding:10px 14px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,.2);z-index:1000000;cursor:pointer;}',
      '#live2dcanvas.live2d-hidden,#live2d-controls.live2d-hidden,#live2d-talk.live2d-hidden{display:none !important;}'
    ].join('')
    document.head.appendChild(style)
  }

  function ensureUi() {
    ensureStyle()

    bubble = document.getElementById('live2d-talk')
    if (!bubble) {
      bubble = document.createElement('div')
      bubble.id = 'live2d-talk'
      document.body.appendChild(bubble)
    }

    controls = document.getElementById('live2d-controls')
    if (!controls) {
      controls = document.createElement('div')
      controls.id = 'live2d-controls'

      var hideButton = document.createElement('button')
      hideButton.type = 'button'
      hideButton.dataset.role = 'hide'
      hideButton.textContent = '隐藏'

      controls.appendChild(hideButton)
      document.body.appendChild(controls)

      hideButton.addEventListener('click', function () {
        setHidden(true)
      })
    }

    toggle = document.getElementById('live2d-toggle')
    if (!toggle) {
      toggle = document.createElement('button')
      toggle.id = 'live2d-toggle'
      toggle.type = 'button'
      toggle.textContent = '显示看板娘'
      toggle.addEventListener('click', function () {
        setHidden(false)
        showMessage('我回来啦。')
      })
      document.body.appendChild(toggle)
    }

  }

  function syncLayout() {
    ensureUi()

    if (canvas) {
      canvas.style.left = LEFT + 'px'
      canvas.style.bottom = BOTTOM + 'px'
      canvas.style.width = WIDTH + 'px'
      canvas.style.height = HEIGHT + 'px'
      canvas.classList.toggle('live2d-hidden', state.hidden)
    }

    controls.style.left = LEFT + 'px'
    controls.style.bottom = BOTTOM + HEIGHT + 14 + 'px'
    controls.classList.toggle('live2d-hidden', state.hidden)

    bubble.style.left = LEFT + 'px'
    bubble.style.bottom = BOTTOM + HEIGHT + 62 + 'px'
    bubble.classList.toggle('live2d-hidden', state.hidden)

    toggle.style.left = LEFT + 'px'
    toggle.style.bottom = BOTTOM + 14 + 'px'
    toggle.style.display = state.hidden ? 'block' : 'none'

    saveState()
  }



  function showMessage(message) {
    ensureUi()
    bubble.innerText = message
    bubble.style.opacity = '1'
    clearTimeout(hideTimer)
    hideTimer = setTimeout(function () {
      bubble.style.opacity = '0'
    }, 4000)
  }

  function randomMessage() {
    return messages[Math.floor(Math.random() * messages.length)]
  }

  function setHidden(hidden) {
    state.hidden = hidden
    syncLayout()
  }



  function attachCanvas(target) {
    canvas = target
    if (canvas.dataset.live2dHelperBound === 'true') {
      syncLayout()
      return
    }

    canvas.dataset.live2dHelperBound = 'true'
    canvas.style.cursor = 'pointer'
    canvas.addEventListener('click', function () {
      showMessage(randomMessage())
    })
    syncLayout()
    showMessage('你好呀，欢迎来到小唐的博客。')
  }

  function waitForCanvas() {
    clearInterval(checkTimer)
    var attempts = 0
    checkTimer = setInterval(function () {
      attempts += 1
      var target = document.getElementById('live2dcanvas')
      if (target) {
        clearInterval(checkTimer)
        attachCanvas(target)
      } else if (attempts > 120) {
        clearInterval(checkTimer)
        console.error('[Live2D] Canvas not found before timeout')
      }
    }, 100)
  }

  function refresh() {
    ensureUi()
    waitForCanvas()
    if (!resizeBound) {
      resizeBound = true
      window.addEventListener('resize', syncLayout)
    }
  }

  helper.initialized = true
  helper.refresh = refresh
  window.__xtLive2DHelper = helper

  document.addEventListener('DOMContentLoaded', refresh)
  document.addEventListener('pjax:complete', refresh)
  refresh()
})()