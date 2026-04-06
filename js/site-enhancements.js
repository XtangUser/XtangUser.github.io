(function () {
  var helper = window.__xtSiteEnhancements || {}
  var START_TIME = new Date('2024-03-23T00:00:00+08:00').getTime()
  var STATUS_ID = 'site-status-dock'
  var RUNTIME_VALUE_ID = 'site-runtime-value'
  var PV_VALUE_ID = 'site-pv-value'
  var UV_VALUE_ID = 'site-uv-value'
  var COMMENT_BUTTON_ID = 'comment-jump-button'
  var TIMER_INTERVAL = 1000

  if (helper.initialized) {
    helper.refresh()
    return
  }

  var timer = null

  function pad(value) {
    return String(value).padStart(2, '0')
  }

  function formatRuntime() {
    var seconds = Math.floor(Math.max(0, Date.now() - START_TIME) / 1000)
    var days = Math.floor(seconds / 86400)
    seconds -= days * 86400
    var hours = Math.floor(seconds / 3600)
    seconds -= hours * 3600
    var minutes = Math.floor(seconds / 60)
    seconds -= minutes * 60

    return days + ' 天 ' + pad(hours) + ' 时 ' + pad(minutes) + ' 分 ' + pad(seconds) + ' 秒'
  }

  function shouldLazyLoad(image) {
    return !image.closest('#navbar, .navbar, .banner, .banner-wrapper, #footer, .footer, .about-avatar, .avatar, .site-brand, .logo-wrapper')
  }

  function applyFallback(image) {
    if (!image || image.dataset.xtFallbackBound === 'true') return

    image.dataset.xtFallbackBound = 'true'
    image.addEventListener('error', function () {
      var fallback = image.dataset.fallbackSrc || '/img/default.png'
      if (image.dataset.xtFallbackUsed === fallback) return
      image.dataset.xtFallbackUsed = fallback
      image.src = fallback
    })
  }

  function enhanceImages(root) {
    var images = (root || document).querySelectorAll('img')

    Array.prototype.forEach.call(images, function (image) {
      if (image.dataset.xtLazyEnhanced === 'true') return
      if (!shouldLazyLoad(image)) return

      image.loading = 'lazy'
      image.decoding = 'async'
      image.dataset.xtLazyEnhanced = 'true'
      applyFallback(image)
    })

    Array.prototype.forEach.call(images, applyFallback)
  }

  function ensureStatusDock() {
    var dock = document.getElementById(STATUS_ID)
    var footerInner = document.querySelector('#footer .footer-inner')
    if (!dock) {
      dock = document.createElement('div')
      dock.id = STATUS_ID
      dock.setAttribute('aria-live', 'polite')
      dock.innerHTML = [
        '<span class="site-status-label">已运行</span>',
        '<span id="' + RUNTIME_VALUE_ID + '" class="site-status-value"></span>',
        '<span class="site-status-separator">|</span>',
        '<span class="site-status-label">总访问量</span>',
        '<span id="' + PV_VALUE_ID + '" class="site-status-value"></span>',
        '<span class="site-status-suffix">次</span>',
        '<span class="site-status-separator">|</span>',
        '<span class="site-status-label">总访客数</span>',
        '<span id="' + UV_VALUE_ID + '" class="site-status-value"></span>',
        '<span class="site-status-suffix">人</span>'
      ].join(' ')
      if (footerInner) {
        footerInner.appendChild(dock)
      } else {
        document.body.appendChild(dock)
      }
    } else if (footerInner && dock.parentNode !== footerInner) {
      footerInner.appendChild(dock)
    }

    var runtimeValue = document.getElementById(RUNTIME_VALUE_ID)
    if (runtimeValue) {
      runtimeValue.textContent = formatRuntime()
    }

    var pvValue = document.getElementById(PV_VALUE_ID)
    var uvValue = document.getElementById(UV_VALUE_ID)
    var pvSource = document.querySelector('#openkounter-site-pv')
    var uvSource = document.querySelector('#openkounter-site-uv')

    if (pvValue) {
      pvValue.textContent = (pvSource && pvSource.textContent.trim()) || '502'
    }
    if (uvValue) {
      uvValue.textContent = (uvSource && uvSource.textContent.trim()) || '348'
    }

    return dock
  }

  function scrollToComments() {
    var target = document.getElementById('gitalk-container')
    if (!target) return

    target.scrollIntoView({ behavior: 'smooth', block: 'start' })

    window.setTimeout(function () {
      var textarea = target.querySelector('textarea')
      if (textarea) {
        textarea.focus({ preventScroll: true })
      }
    }, 500)
  }

  function ensureCommentButton() {
    var target = document.getElementById('gitalk-container')
    if (!target) return

    var button = document.getElementById(COMMENT_BUTTON_ID)
    if (!button) {
      button = document.createElement('button')
      button.id = COMMENT_BUTTON_ID
      button.type = 'button'
      button.textContent = '评论'
      button.addEventListener('click', scrollToComments)
      document.body.appendChild(button)
    }
  }

  function refresh() {
    enhanceImages(document)
    ensureStatusDock()
    ensureCommentButton()

    if (!timer) {
      timer = window.setInterval(ensureStatusDock, TIMER_INTERVAL)
    }
  }

  helper.initialized = true
  helper.refresh = refresh
  window.__xtSiteEnhancements = helper

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh)
  } else {
    refresh()
  }

  document.addEventListener('pjax:complete', refresh)
})()
