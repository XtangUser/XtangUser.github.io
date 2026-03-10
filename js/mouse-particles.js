;(function () {
  'use strict'

  var canvas = document.createElement('canvas')
  canvas.id = 'mouse-particle-canvas'
  canvas.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:100%',
    'height:100%',
    'pointer-events:none',
    'z-index:99998'
  ].join(';')
  document.body.appendChild(canvas)

  var ctx = canvas.getContext('2d')
  var particles = []
  var hue = 0

  function resize() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  window.addEventListener('resize', resize)
  resize()

  document.addEventListener('mousemove', function (e) {
    hue = (hue + 4) % 360
    for (var i = 0; i < 3; i++) {
      particles.push({
        x: e.clientX,
        y: e.clientY,
        vx: (Math.random() - 0.5) * 2.5,
        vy: (Math.random() - 0.5) * 2.5 - 0.8,
        radius: Math.random() * 5 + 2,
        alpha: 0.9,
        hue: (hue + Math.random() * 50 - 25 + 360) % 360
      })
    }
  })

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.06
      p.alpha -= 0.024
      p.radius *= 0.972
      if (p.alpha <= 0 || p.radius < 0.4) {
        particles.splice(i, 1)
        continue
      }
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = 'hsl(' + p.hue + ',85%,65%)'
      ctx.shadowBlur = 10
      ctx.shadowColor = 'hsl(' + p.hue + ',85%,65%)'
      ctx.fill()
      ctx.restore()
    }
    requestAnimationFrame(animate)
  }

  animate()
})()
