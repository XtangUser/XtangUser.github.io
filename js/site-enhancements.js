(function () {
  var helper = window.__xtSiteEnhancements || {}
  var START_TIME = new Date('2024-03-23T00:00:00+08:00').getTime()
  var RUNTIME_ID = 'site-runtime-badge'
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

  function enhanceImages(root) {
    var images = (root || document).querySelectorAll('img')

    Array.prototype.forEach.call(images, function (image) {
      if (image.dataset.xtLazyEnhanced === 'true') return
      if (!shouldLazyLoad(image)) return

      image.loading = 'lazy'
      image.decoding = 'async'
      image.dataset.xtLazyEnhanced = 'true'
    })
  }

  function ensureRuntimeBadge() {
    var badge = document.getElementById(RUNTIME_ID)
    if (!badge) {
      badge = document.createElement('div')
      badge.id = RUNTIME_ID
      badge.setAttribute('aria-live', 'polite')
      document.body.appendChild(badge)
    }

    badge.textContent = '已运行 ' + formatRuntime()
    return badge
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
    ensureRuntimeBadge()
    ensureCommentButton()

    if (!timer) {
      timer = window.setInterval(ensureRuntimeBadge, TIMER_INTERVAL)
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
