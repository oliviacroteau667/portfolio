// Mobile nav toggle — shared across all pages
function initSiteInteractions() {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Typing animation for hero subtitle
  var words = ['Humanitarian', 'Technologist', 'Data Analyst', 'Researcher', 'Public Speaker'];
  var el = document.querySelector('.typed-word');
  if (!el) return;

  var ell = '...';
  var wordIndex = 0;
  var charIndex = 0;
  var deleting = false;

  function tick() {
    var current = words[wordIndex];
    if (!deleting) {
      charIndex += 1;
      el.textContent = current.slice(0, charIndex) + (charIndex === current.length ? ell : '');

      if (charIndex === current.length) {
        window.setTimeout(function () {
          deleting = true;
          tick();
        }, 1000);
      } else {
        window.setTimeout(tick, 110);
      }
    } else {
      if (el.textContent.endsWith(ell)) {
        el.textContent = current.slice(0, charIndex);
        window.setTimeout(tick, 80);
        return;
      }

      if (charIndex > 0) {
        charIndex -= 1;
        el.textContent = current.slice(0, charIndex);
        window.setTimeout(tick, 60);
      } else {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        window.setTimeout(tick, 200);
      }
    }
  }

  tick();
}

document.addEventListener('DOMContentLoaded', initSiteInteractions);
if (document.readyState !== 'loading') {
  initSiteInteractions();
}

// Convert vertical wheel/touch scroll into horizontal timeline scroll
function initTimelineScroll() {
  var timeline = document.querySelector('.timeline');
  if (!timeline) return;

  function isTimelineInView() {
    var rect = timeline.getBoundingClientRect();
    // Active only when the entire timeline is within the viewport
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  }

  function handleWheel(e) {
    if (!isTimelineInView()) return; // allow normal vertical scrolling

    var delta = e.deltaY || e.deltaX;
    if (!delta) return;

    var maxScroll = timeline.scrollWidth - timeline.clientWidth;
    var intended = timeline.scrollLeft + delta;

    // If scrolling rightwards (delta > 0)
    if (delta > 0) {
      // If we've already centered the final entry, allow page vertical scroll to resume
      if (finalCentered && finalTarget !== null && timeline.scrollLeft >= finalTarget - 1) {
        return; // allow default vertical scrolling
      }
      // If there's room to scroll within the timeline, hijack and scroll horizontally
      if (intended > 0 && intended < maxScroll - 1) {
        e.preventDefault();
        timeline.scrollLeft = intended;
        return;
      }

      // If we would hit or pass the right edge, center the final entry first
      e.preventDefault();
      centerLastEntry();
      return;
    }

    // Scrolling leftwards (delta < 0)
    if (intended <= 0) {
      // If scrolling up and would go past left edge, snap to 0 and allow page scroll
      timeline.scrollLeft = 0;
      return; // allow page to scroll normally
    }

    // Otherwise hijack and scroll horizontally left
    e.preventDefault();
    timeline.scrollLeft = Math.max(0, intended);
  }

  // touch support for mobile: convert vertical touchmove to horizontal
  var touchStartY = 0;
  var touchStartX = 0;

  function handleTouchStart(e) {
    if (!e.touches || e.touches.length === 0) return;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  }

  function handleTouchMove(e) {
    if (!isTimelineInView()) return;
    if (!e.touches || e.touches.length === 0) return;
    var touchY = e.touches[0].clientY;
    var touchX = e.touches[0].clientX;
    var deltaY = touchStartY - touchY;
    var deltaX = touchStartX - touchX;
    var delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;

    var maxScroll = timeline.scrollWidth - timeline.clientWidth;
    var intended = timeline.scrollLeft + delta;

    if (delta > 0) {
      if (finalCentered && finalTarget !== null && timeline.scrollLeft >= finalTarget - 1) {
        return;
      }
      if (intended > 0 && intended < maxScroll - 1) {
        e.preventDefault();
        timeline.scrollLeft = intended;
        touchStartY = touchY;
        touchStartX = touchX;
        return;
      }

      e.preventDefault();
      centerLastEntry();
      return;
    }

    if (intended <= 0) {
      timeline.scrollLeft = 0;
      return;
    }

    e.preventDefault();
    timeline.scrollLeft = Math.max(0, intended);
    // if at edges, let the page handle the touch (don't preventDefault)
  }

  // Center the last entry and mark when it's fully centered so page scroll can resume
  var finalTarget = null;
  var finalCentered = false;
  var centeringInProgress = false;

  function centerLastEntry() {
    if (centeringInProgress) return;
    var items = timeline.querySelectorAll('.timeline-entry');
    if (!items || items.length === 0) return;
    var last = items[items.length - 1];
    var timelineRect = timeline.getBoundingClientRect();
    var elRect = last.getBoundingClientRect();
    var currentScroll = timeline.scrollLeft || 0;
    var elementCenterInScroll = currentScroll + (elRect.left - timelineRect.left) + (elRect.width / 2);
    var target = elementCenterInScroll - (timeline.clientWidth / 2);
    var max = Math.max(0, timeline.scrollWidth - timeline.clientWidth);
    target = Math.max(0, Math.min(max, Math.round(target)));

    finalTarget = target;
    finalCentered = false;
    centeringInProgress = true;

    try { timeline.scrollTo({ left: target, behavior: 'smooth' }); }
    catch (err) { timeline.scrollLeft = target; }

    // Poll until the scrollLeft reaches the target (or is very close)
    function check() {
      if (Math.abs(timeline.scrollLeft - finalTarget) <= 2) {
        finalCentered = true;
        centeringInProgress = false;
        return;
      }
      requestAnimationFrame(check);
    }
    requestAnimationFrame(check);
  }

  window.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('touchstart', handleTouchStart, { passive: true });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });

  // When timeline becomes active in the viewport (user scrolls down to it),
  // center the first entry horizontally so `01` has left whitespace.
  var timelineActivated = false;

  function centerFirstEntry() {
    var first = timeline.querySelector('.timeline-entry');
    if (!first) return;

    var timelineRect = timeline.getBoundingClientRect();
    var elRect = first.getBoundingClientRect();
    var currentScroll = timeline.scrollLeft || 0;
    var elementCenterInScroll = currentScroll + (elRect.left - timelineRect.left) + (elRect.width / 2);
    var target = elementCenterInScroll - (timeline.clientWidth / 2);
    var max = Math.max(0, timeline.scrollWidth - timeline.clientWidth);
    target = Math.max(0, Math.min(max, Math.round(target)));

    try { timeline.scrollTo({ left: target, behavior: 'auto' }); }
    catch (err) { timeline.scrollLeft = target; }
  }

  function checkActivation() {
    var inView = isTimelineInView();
    if (inView && !timelineActivated) {
      timelineActivated = true;
      // center after a frame so layout has settled
      requestAnimationFrame(centerFirstEntry);
    } else if (!inView && timelineActivated) {
      timelineActivated = false;
      // reset end-state so future timeline interactions behave normally
      finalCentered = false;
      finalTarget = null;
      centeringInProgress = false;
    }
  }

  window.addEventListener('scroll', checkActivation, { passive: true });
  window.addEventListener('resize', function () { requestAnimationFrame(checkActivation); }, { passive: true });
}

document.addEventListener('DOMContentLoaded', initTimelineScroll);
if (document.readyState !== 'loading') {
  initTimelineScroll();
}