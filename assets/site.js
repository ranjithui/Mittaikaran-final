/* Mittaikaran — behaviour for the static site.
 *
 * Everything visual is CSS. This file only covers what CSS cannot express:
 * the header state, the scroll-spy, the drifting carousels, the Traditional
 * cards, the collection tabs, and the corporate enquiry. Each block exits
 * quietly when its markup is not on the page, so one file serves all three.
 */
(function () {
  'use strict'

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---- header: solid past the hero, and publish its height ----------------
  var head = document.querySelector('.site-head')
  var header = document.querySelector('.header')
  if (header) {
    var onScroll = function () {
      header.classList.toggle('solid', window.scrollY > 40)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
  }
  if (head) {
    // Only the expanded height is published: the bar shrinks on scroll, and a
    // spacer that shrank with it would drag the page up mid-scroll.
    var syncHeight = function () {
      if (header && header.classList.contains('solid')) return
      document.documentElement.style.setProperty('--header-h', head.offsetHeight + 'px')
    }
    syncHeight()
    window.addEventListener('resize', syncHeight)
    window.addEventListener('load', syncHeight)
  }

  // ---- scroll-spy: underline whichever section is in view ------------------
  var navLinks = [].slice.call(document.querySelectorAll('.nav a'))
  var spy = navLinks.filter(function (a) { return (a.getAttribute('href') || '').indexOf('#') > -1 })
  if (spy.length && 'IntersectionObserver' in window) {
    var targets = spy.map(function (a) {
      var id = a.getAttribute('href').split('#')[1]
      return id ? document.getElementById(id) : null
    })
    var known = targets.filter(Boolean)
    if (known.length) {
      var io = new IntersectionObserver(function (entries) {
        var seen = entries.filter(function (e) { return e.isIntersecting })
        if (!seen.length) return
        var id = seen[0].target.id
        spy.forEach(function (a, i) {
          a.classList.toggle('active', targets[i] && targets[i].id === id)
        })
      }, { rootMargin: '-45% 0px -50% 0px' })
      known.forEach(function (s) { io.observe(s) })
    }
  }

  // ---- drifting carousels --------------------------------------------------
  // The cards are rendered twice in the HTML; when the scroll passes the half
  // way mark it jumps back by exactly one copy, so the loop has no seam.
  [].forEach.call(document.querySelectorAll('.carousel-row.auto'), function (row) {
    if (reduceMotion) return
    var speed = 40, paused = false, last = 0
    row.addEventListener('mouseenter', function () { paused = true })
    row.addEventListener('mouseleave', function () { paused = false })
    row.addEventListener('focusin', function () { paused = true })
    row.addEventListener('focusout', function () { paused = false })
    var step = function (now) {
      var dt = last ? Math.min((now - last) / 1000, 0.1) : 0
      last = now
      var half = row.scrollWidth / 2
      if (!paused && !document.hidden) row.scrollLeft += speed * dt
      if (half > 0 && row.scrollLeft >= half) row.scrollLeft -= half
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })

  // ---- Traditional cards: the product inside each card cycles --------------
  var curatedSection = document.querySelector('.curated')
  if (curatedSection) {
    var interval = Number(curatedSection.getAttribute('data-interval')) || 4000
    ;[].forEach.call(curatedSection.querySelectorAll('.trad-card'), function (card) {
      var slides
      try { slides = JSON.parse(card.getAttribute('data-slides') || '[]') } catch (e) { slides = [] }
      if (slides.length < 2) return
      var imgs = card.querySelectorAll('.trad-media img')
      var dots = card.querySelectorAll('.trad-dots button')
      var swap = card.querySelector('.trad-swap')
      var i = Number(card.getAttribute('data-index')) || 0
      var timer

      var show = function (n) {
        i = (n + slides.length) % slides.length
        for (var k = 0; k < imgs.length; k++) imgs[k].classList.toggle('on', k === i)
        for (var j = 0; j < dots.length; j++) {
          dots[j].classList.toggle('on', j === i)
          if (j === i) dots[j].setAttribute('aria-current', 'true')
          else dots[j].removeAttribute('aria-current')
        }
        swap.querySelector('h4').textContent = slides[i].name || ''
        swap.querySelector('p').textContent = slides[i].desc || ''
        // Restart the fade-in: removing the class and forcing a reflow before
        // adding it back is what makes the animation play again.
        swap.style.animation = 'none'
        void swap.offsetWidth
        swap.style.animation = ''
        queue()
      }
      var queue = function () {
        clearTimeout(timer)
        if (!reduceMotion) timer = setTimeout(function () { show(i + 1) }, interval)
      }
      for (var j = 0; j < dots.length; j++) {
        (function (n) { dots[n].addEventListener('click', function () { show(n) }) })(j)
      }
      queue()
    })
  }

  // ---- collection tabs -----------------------------------------------------
  [].forEach.call(document.querySelectorAll('.collection'), function (section) {
    var tabs = section.querySelectorAll('.tab')
    var cards = section.querySelectorAll('.coll-card')
    if (!tabs.length) return
    ;[].forEach.call(tabs, function (tab) {
      tab.addEventListener('click', function () {
        var want = tab.getAttribute('data-tab')
        ;[].forEach.call(tabs, function (t) {
          var on = t === tab
          t.classList.toggle('active', on)
          t.setAttribute('aria-selected', on ? 'true' : 'false')
        })
        var shown = 0
        ;[].forEach.call(cards, function (card) {
          var on = card.getAttribute('data-tab') === want
          card.hidden = !on
          // Restack, so the overlap order still runs left to right.
          if (on) card.style.setProperty('--z', ++shown)
        })
      })
    })
  })

  // ---- corporate gifting ---------------------------------------------------
  var products
  try { products = JSON.parse(document.body.getAttribute('data-products') || 'null') } catch (e) { products = null }
  if (products) {
    var whatsapp = (document.body.getAttribute('data-whatsapp') || '').replace(/\D/g, '')
    var qty = {}
    products.forEach(function (p) { qty[p.id] = 0 })

    var openWhatsApp = function (message) {
      window.open('https://wa.me/' + whatsapp + '?text=' + encodeURIComponent(message), '_blank', 'noopener')
    }
    var summary = document.querySelector('.corp-summary')
    var refresh = function () {
      // Every stepper for a pack mirrors the same number, on the card and in
      // the form, so editing either place stays in sync.
      ;[].forEach.call(document.querySelectorAll('[data-stepper]'), function (box) {
        var input = box.querySelector('input')
        var v = qty[box.getAttribute('data-stepper')]
        if (Number(input.value) !== v) input.value = v
      })
      if (summary) {
        var n = products.filter(function (p) { return qty[p.id] > 0 }).length
        summary.textContent = n ? n + ' pack' + (n > 1 ? 's' : '') + ' selected' : 'No packs selected yet'
      }
    }
    var setQty = function (id, n) { qty[id] = Math.max(0, Number(n) || 0); refresh() }

    ;[].forEach.call(document.querySelectorAll('[data-stepper]'), function (box) {
      var id = box.getAttribute('data-stepper')
      ;[].forEach.call(box.querySelectorAll('button'), function (b) {
        b.addEventListener('click', function () {
          setQty(id, qty[id] + Number(b.getAttribute('data-step')))
        })
      })
      box.querySelector('input').addEventListener('input', function (e) { setQty(id, e.target.value) })
    })

    var find = function (id) {
      for (var i = 0; i < products.length; i++) if (products[i].id === id) return products[i]
      return null
    }

    ;[].forEach.call(document.querySelectorAll('[data-wa]'), function (btn) {
      btn.addEventListener('click', function () {
        var p = find(btn.getAttribute('data-wa'))
        if (!p) return
        var n = qty[p.id] || 1
        openWhatsApp(
          "Hi Mittaikaran, I'd like to enquire about Corporate Gifting.\n\n" +
          '• Pack: ' + p.name + ' (' + p.desc + ')\n• Quantity: ' + n +
          '\n\nPlease share pricing and details.')
      })
    })

    ;[].forEach.call(document.querySelectorAll('[data-goto-form]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-goto-form')
        if (!(qty[id] > 0)) setQty(id, 1)
        var form = document.getElementById('enquiry-form')
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    })

    var form = document.querySelector('.corp-form')
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault()
        var chosen = products.filter(function (p) { return qty[p.id] > 0 })
        if (!chosen.length) { alert('Please enter a quantity for at least one pack.'); return }
        var val = function (n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : '' }
        var details = [
          val('name') && 'Name: ' + val('name'),
          val('company') && 'Company: ' + val('company'),
          val('phone') && 'Phone: ' + val('phone'),
          val('email') && 'Email: ' + val('email'),
          val('notes') && 'Notes: ' + val('notes'),
        ].filter(Boolean)
        openWhatsApp(
          "Hi Mittaikaran, I'd like a Corporate Gifting enquiry.\n\nPACKS:\n" +
          chosen.map(function (p) { return '• ' + p.name + ' (' + p.desc + ') — Qty: ' + qty[p.id] }).join('\n') +
          '\n\n' + (details.length ? 'MY DETAILS:\n' + details.join('\n') + '\n\n' : '') +
          'Please share pricing and details.')
      })
    }
    refresh()
  }
})()
