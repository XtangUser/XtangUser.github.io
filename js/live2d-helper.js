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
  var preferredVoice = null
  var SPEECH_RATE = 0.9
  var SPEECH_PITCH = 0.88

  function loadState() {
    var defaults = {
      left: 20,
      bottom: 0,
      hidden: false,
      voiceEnabled: true
    }

    try {
      var raw = window.localStorage.getItem(STATE_KEY)
      if (!raw) return defaults
      var saved = JSON.parse(raw)
      return {
        left: typeof saved.left === 'number' ? saved.left : defaults.left,
        bottom: typeof saved.bottom === 'number' ? saved.bottom : defaults.bottom,
        hidden: Boolean(saved.hidden),
        voiceEnabled: saved.voiceEnabled !== false
      }
    } catch (error) {
      return defaults
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STATE_KEY, JSON.stringify(state))
    } catch (error) {}
  }

  function scoreVoice(voice) {
    var text = ((voice.name || '') + ' ' + (voice.lang || '')).toLowerCase()
    var score = 0

    if (text.indexOf('zh') !== -1 || text.indexOf('cmn') !== -1 || text.indexOf('chinese') !== -1) score += 50
    if (text.indexOf('xiaoyi') !== -1 || text.indexOf('晓伊') !== -1) score += 90
    if (text.indexOf('huihui') !== -1 || text.indexOf('慧慧') !== -1) score += 82
    if (text.indexOf('tingting') !== -1 || text.indexOf('婷婷') !== -1) score += 78
    if (text.indexOf('xiaoxiao') !== -1 || text.indexOf('晓晓') !== -1) score += 70
    if (text.indexOf('yaoyao') !== -1 || text.indexOf('云希') !== -1 || text.indexOf('yunxi') !== -1) score += 66
    if (text.indexOf('female') !== -1 || text.indexOf('女') !== -1) score += 35
    if (text.indexOf('natural') !== -1 || text.indexOf('neural') !== -1 || text.indexOf('online') !== -1) score += 30
    if (text.indexOf('male') !== -1 || text.indexOf('男') !== -1) score -= 25
    if (voice.default) score += 10

    return score
  }

  function pickPreferredVoice() {
    if (!('speechSynthesis' in window)) return null

    var voices = window.speechSynthesis.getVoices()
    if (!voices || !voices.length) return null

    var chineseVoices = voices.filter(function (voice) {
      var lang = (voice.lang || '').toLowerCase()
      var name = (voice.name || '').toLowerCase()
      return lang.indexOf('zh') !== -1 || lang.indexOf('cmn') !== -1 || name.indexOf('chinese') !== -1
    })

    var candidates = chineseVoices.length ? chineseVoices : voices
    candidates.sort(function (left, right) {
      return scoreVoice(right) - scoreVoice(left)
    })

    preferredVoice = candidates[0] || null
    return preferredVoice
  }

  function getPreferredVoice() {
    if (preferredVoice) return preferredVoice
    return pickPreferredVoice()
  }

  function clampPosition() {
    var maxLeft = Math.max(0, window.innerWidth - WIDTH - 16)
    var maxBottom = Math.max(0, window.innerHeight - HEIGHT - 64)
    state.left = Math.min(Math.max(0, state.left), maxLeft)
    state.bottom = Math.min(Math.max(0, state.bottom), maxBottom)
  }

  function ensureStyle() {
    if (document.getElementById('live2d-helper-style')) return
    var style = document.createElement('style')
    style.id = 'live2d-helper-style'
    style.textContent = [
      '#live2d-talk{position:fixed;max-width:220px;padding:10px 14px;background:rgba(255,255,255,0.96);border:2px solid #ff69b4;border-radius:14px;font-size:14px;color:#333;line-height:1.6;opacity:0;transition:opacity .3s;z-index:1000000;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.15);font-weight:500;}',
      '#live2d-controls{position:fixed;display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:999px;background:rgba(255,255,255,.94);box-shadow:0 10px 30px rgba(0,0,0,.15);z-index:1000000;backdrop-filter:blur(8px);}',
      '#live2d-controls button{border:0;background:#0f766e;color:#fff;padding:6px 10px;border-radius:999px;font-size:12px;line-height:1;cursor:pointer;}',
      '#live2d-controls button[data-role="drag"]{background:#111827;cursor:grab;}',
      '#live2d-controls button[data-role="drag"].dragging{cursor:grabbing;}',
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

      var dragButton = document.createElement('button')
      dragButton.type = 'button'
      dragButton.dataset.role = 'drag'
      dragButton.textContent = '拖动'

      var voiceButton = document.createElement('button')
      voiceButton.type = 'button'
      voiceButton.dataset.role = 'voice'

      var hideButton = document.createElement('button')
      hideButton.type = 'button'
      hideButton.dataset.role = 'hide'
      hideButton.textContent = '隐藏'

      controls.appendChild(dragButton)
      controls.appendChild(voiceButton)
      controls.appendChild(hideButton)
      document.body.appendChild(controls)

      bindDrag(dragButton)

      voiceButton.addEventListener('click', function () {
        state.voiceEnabled = !state.voiceEnabled
        if (!state.voiceEnabled && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
        updateVoiceButton()
        saveState()
        showMessage(state.voiceEnabled ? '语音播报已开启。' : '语音播报已关闭。')
      })

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

    updateVoiceButton()
  }

  function updateVoiceButton() {
    if (!controls) return
    var voiceButton = controls.querySelector('[data-role="voice"]')
    if (voiceButton) {
      voiceButton.textContent = state.voiceEnabled ? '语音开' : '语音关'
      voiceButton.style.background = state.voiceEnabled ? '#0f766e' : '#9ca3af'
      voiceButton.title = preferredVoice ? ('当前语音: ' + preferredVoice.name) : '当前语音: 浏览器默认'
    }
  }

  function syncLayout() {
    clampPosition()
    ensureUi()

    if (canvas) {
      canvas.style.left = state.left + 'px'
      canvas.style.bottom = state.bottom + 'px'
      canvas.style.width = WIDTH + 'px'
      canvas.style.height = HEIGHT + 'px'
      canvas.classList.toggle('live2d-hidden', state.hidden)
    }

    controls.style.left = state.left + 'px'
    controls.style.bottom = state.bottom + HEIGHT + 14 + 'px'
    controls.classList.toggle('live2d-hidden', state.hidden)

    bubble.style.left = state.left + 'px'
    bubble.style.bottom = state.bottom + HEIGHT + 62 + 'px'
    bubble.classList.toggle('live2d-hidden', state.hidden)

    toggle.style.left = state.left + 'px'
    toggle.style.bottom = state.bottom + 14 + 'px'
    toggle.style.display = state.hidden ? 'block' : 'none'

    saveState()
  }

  function speak(text) {
    if (!state.voiceEnabled || !('speechSynthesis' in window)) return
    var utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = SPEECH_RATE
    utterance.pitch = SPEECH_PITCH
    utterance.volume = 1

    var voice = getPreferredVoice()
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang || 'zh-CN'
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  function showMessage(message) {
    ensureUi()
    bubble.innerText = message
    bubble.style.opacity = '1'
    clearTimeout(hideTimer)
    hideTimer = setTimeout(function () {
      bubble.style.opacity = '0'
    }, 4000)
    speak(message)
  }

  function randomMessage() {
    return messages[Math.floor(Math.random() * messages.length)]
  }

  function setHidden(hidden) {
    state.hidden = hidden
    syncLayout()
    if (hidden && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  function bindDrag(handle) {
    var dragging = false
    var startX = 0
    var startY = 0
    var startLeft = 0
    var startBottom = 0

    handle.addEventListener('mousedown', function (event) {
      dragging = true
      startX = event.clientX
      startY = event.clientY
      startLeft = state.left
      startBottom = state.bottom
      handle.classList.add('dragging')
      event.preventDefault()
    })

    window.addEventListener('mousemove', function (event) {
      if (!dragging) return
      state.left = startLeft + (event.clientX - startX)
      state.bottom = startBottom - (event.clientY - startY)
      syncLayout()
    })

    window.addEventListener('mouseup', function () {
      if (!dragging) return
      dragging = false
      handle.classList.remove('dragging')
      saveState()
    })
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

  if ('speechSynthesis' in window) {
    pickPreferredVoice()
    window.speechSynthesis.addEventListener('voiceschanged', function () {
      pickPreferredVoice()
      updateVoiceButton()
    })
  }

  document.addEventListener('DOMContentLoaded', refresh)
  document.addEventListener('pjax:complete', refresh)
  refresh()
})()