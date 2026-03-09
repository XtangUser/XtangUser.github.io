document.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    var messages = [
      '你好呀~欢迎来到小唐的博客！',
      '今天也要加油哦！',
      '喜欢的话记得收藏哦～',
      '记得多喝水，注意休息！',
      '有技术问题尽管来找我～',
      '学习使我快乐！',
      '代码改变世界！',
      '嘿嘿，被你发现啦～'
    ]
    var bubble = null
    var hideTimer = null

    function showMessage(message) {
      if (!bubble) {
        bubble = document.createElement('div')
        bubble.id = 'live2d-talk'
        bubble.style.cssText = 'position:fixed;bottom:420px;left:10px;max-width:200px;padding:10px 14px;background:rgba(255,255,255,0.95);border:2px solid #ff69b4;border-radius:12px;font-size:14px;color:#333;line-height:1.6;opacity:0;transition:all 0.3s;z-index:999999;pointer-events:none;box-shadow:0 3px 10px rgba(0,0,0,0.2);font-weight:500;'
        document.body.appendChild(bubble)
      }

      bubble.innerText = message
      bubble.style.opacity = '1'
      clearTimeout(hideTimer)
      hideTimer = setTimeout(function () {
        bubble.style.opacity = '0'
      }, 4000)
    }

    var attempts = 0
    var checkInterval = setInterval(function () {
      attempts += 1
      var canvas = document.getElementById('live2dcanvas')

      if (canvas) {
        clearInterval(checkInterval)
        showMessage(messages[0])
        canvas.addEventListener('click', function () {
          showMessage(messages[Math.floor(Math.random() * messages.length)])
        })
      } else if (attempts > 100) {
        clearInterval(checkInterval)
        console.error('[Live2D] Canvas not found before timeout')
      }
    }, 100)
  }, 2000)
})