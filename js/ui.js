/* global $, Mousetrap */

/*! dudubaby.org | ui.js v1.0 | MIT/Expat */

/* feross/standard style: https://github.com/feross/standard */

/* History mechanism partially inspired by https://rosspenman.com/pushstate-jquery/ */
$(function () {
  // Simplified in-memory history stack
  function HistoryStack () {
    var stack = []
    var pointer = -1 // index of current element in stack
    var stackTop = -1 // index of current topmost element in stack

    // Clear the history stack
    this.clear = function () {
      stack = []
      pointer = -1
      stackTop = -1
    }

    // Push an entry to the history stack.
    this.push = function (href) {
      if (href === null || href === undefined) {
        throw new Error('DropOutHistoryStack.push: href must be defined and non-null')
      }
      pointer += 1
      stack[pointer] = href
      stackTop = pointer // reset stackTop after a push
      stack.splice(stackTop + 1)
    }

    // Returns the current href.
    // null if the stack is empty.
    this.current = function () {
      if (pointer >= 0) {
        return stack[pointer]
      } else {
        return null
      }
    }

    // Returns the current position in stack.
    // -1 if the stack is empty.
    this.current_position = function () {
      return pointer
    }

    // Returns the previous href.
    // null if we're at the bottom of the stack, or if the stack is empty.
    this.prev = function () {
      if (pointer > 0) {
        return stack[pointer - 1]
      } else {
        return null
      }
    }

    // Returns the next href.
    // null if we're at the top of the stack, or if the stack is empty.
    this.next = function () {
      if (pointer < stackTop) {
        return stack[pointer + 1]
      } else {
        return null
      }
    }

    // Returns the current href, and moves the pointer back one slot.
    // Pointer is not moved if we're at the bottom of the stack, or if the
    // stack is empty. Either case, the return value is null.
    this.back = function () {
      if (pointer > 0) {
        pointer -= 1
        return stack[pointer + 1]
      } else {
        return null
      }
    }

    // Returns the current href, and moves the pointer forward one slot.
    // Pointer is not moved if we're at the top of the stack, or if the stack
    // is empty. Either case, the return value is null.
    this.forward = function () {
      if (pointer < stackTop) {
        pointer += 1
        return stack[pointer - 1]
      } else {
        return null
      }
    }

    // Checks if href is the next or the previous href in the history stack.
    // If href is not given, check the current window location.
    // If href is the next in the history stack, return 'next';
    // Otherwise, if href is the previous in the history stack, return 'prev';
    // Otherwise, return null.
    this.check = function (href) {
      href = href || window.location.href
      if (this.next() === href) {
        return 'next'
      } else if (this.prev() === href) {
        return 'prev'
      } else {
        return null
      }
    }

    this.valueOf = function () {
      return {
        stack: stack.slice(0, stackTop + 1),
        pointer: pointer,
        href: pointer >= 0 ? stack[pointer] : null
      }
    }
  }

  HistoryStack.prototype.toString = function () {
    return JSON.stringify(this.valueOf(), null, 1)
  }

  window.myHistory = new HistoryStack(3)
  var myHistory = window.myHistory

  var sitePrefix = window.location.protocol + '//' + window.location.host

  var $window = $(window)
  var $document = $(document)
  var $body = $('body')
  var $main = $('main')

  // Whether the browser supports the download attribute (used for deciding
  // whether to show a download link in fancybox)
  var downloadAttributeSupported

  // Used for timing XHRs
  // Only if we had the user timing API in Safari...
  // http://caniuse.com/#feat=user-timing
  var loadingStart

  var interactionsHomePattern = new RegExp('/interactions(/(index(\\.html)?)?)?')
  // The first character after /interactions/, [^/i], is to exclude
  // index(.html) from matching.
  var interactionsPagePattern = new RegExp('/interactions/([^/i][^/]*?)(\\.html)?$')
  var internalImagePattern = new RegExp('^/assets/images/')
  var externalLinkPattern = new RegExp('^(https?:)?//')
  var altProtocolPattern = new RegExp('^(javascript|mailto):')

  // Set up Google Analytics command queue
  var gaTrackingId = window.gaTrackingId // Should be set elsewhere
  delete window.gaTrackingId
  window.ga = function () { window.ga.q.push(arguments) }
  window.ga.l = +new Date()
  window.ga.q = [
    ['create', gaTrackingId, 'auto'],
    ['set', 'page', window.location.pathname],
    ['send', 'pageview']
  ]

  // Send a virtual page view to Google Analytics, with the current path
  // https://developers.google.com/analytics/devguides/collection/analyticsjs/single-page-applications
  var resendGaPageView = function () {
    if (gaTrackingId) {
      window.ga('set', 'page', window.location.pathname)
      window.ga('send', 'pageview')
    }
  }

  // Send page load time (either fresh load or XHR) to Google Analytics
  // https://developers.google.com/analytics/devguides/collection/analyticsjs/user-timings
  //
  // Here timingStart is performance.now() at the beginning of the timing
  // period (0 for fresh load). We only send this data if the navigation timing
  // API is supported.
  var sendGaTiming = function (category, variable, timingStart) {
    if (window.performance) {
      var timeSinceStart = Math.round(window.performance.now() - timingStart)
      window.ga('send', 'timing', category, variable, timeSinceStart)
    }
  }

  var urlWithoutHash = function (url) {
    if (!url) {
      return url
    }
    var hashPos = url.indexOf('#')
    return hashPos >= 0 ? url.substr(0, hashPos) : url
  }

  // Simulate a click on a link to href
  var clickLink = function (href) {
    var virtualLink = $('<a href="' + encodeURI(href) + '" style="display:none"></a>')
    virtualLink.appendTo($body).click().remove()
  }

  // Random sinaimg domain in the list ww[1-4].sinaimg.cn
  var sinaImgDomain = function () {
    var rand = Math.floor(Math.random() * 4) + 1
    return 'ww' + rand + '.sinaimg.cn'
  }

  var scrollToHash = function (hash) {
    if (hash) {
      var offset = $(hash).offset()
      if (offset !== undefined) {
        $window.scrollTop($(hash).offset().top)
      }
    }
  }

  // Returns a jQuery object that contains the first on-screen (smartly
  // determined) status, if any.
  //
  // Allows a custom filter function to limit the selection pool to qualifying
  // statuses (e.g., ones with galleries). The filter function takes one
  // argument: the .status DOM element.
  var firstOnScreenStatus = function (filter) {
    var $onScreenStatuses = $('.status:onScreen')
    if (filter !== undefined) {
      $onScreenStatuses = $onScreenStatuses.filter(function (i, e) {
        return filter(e)
      })
    }
    if ($onScreenStatuses.length <= 1) {
      return $onScreenStatuses
    }

    var $first = $onScreenStatuses.first()
    var $second = $onScreenStatuses.slice(1, 2)
    var firstBottom = $first.offset().top + $first.height()
    var secondTop = $second.offset().top
    var viewportTop = $window.scrollTop()
    var viewportBottom = viewportTop + $window.height()

    if (secondTop > viewportBottom - 50) {
      // Visible portion of second status < 50px
      return $first
    }

    var $toggler = $first.find('.comments-toggler')
    var hasComments = $toggler.length > 0
    var commentsTop = hasComments ? $toggler.offset().top : null
    // Bottom of the status, excluding comments (.status-text, .complete-link,
    // .orig-post-text or .gallery)
    var statusBottom = hasComments ? commentsTop : firstBottom

    var $gallery = $first.find('.gallery')
    var hasGallery = $gallery.length > 0
    var galleryBottom = hasGallery ? ($gallery.offset().top + $gallery.height()) : null

    if (hasGallery) {
      if (galleryBottom > viewportTop + 90) {
        // At least 90px (3/4 of an image) of the gallery is visible
        return $first
      } else {
        return $second
      }
    } else {
      if (statusBottom > viewportTop + 30) {
        // At least 30px (including margin) of some sort of textual content of
        // the status is visible
        return $first
      } else {
        return $second
      }
    }
  }

  // Returns a jQuery object that contains the current status (if any. The
  // current status is the currenly highlighted status, if any, or the first
  // on-screen status, if any.
  //
  // Takes an optional filter argument which is passed to firstOnScreenStatus
  // when the latter is called.
  var currentStatus = function (filter) {
    var current = $('.status.focus').first()
    if (current.length > 0) {
      return current
    }
    return firstOnScreenStatus(filter)
  }

  // node is 'prev', 'next', or an id
  // callback receives one argument: id of the highlighted status; only called
  // when the highlight actually changes
  //
  // Note: highlightStatus has a callback unlike most other helper functions is
  // due to the potential frequency it is beinged called (when j or k is held
  // down) and more importantly, the saveState call that follows it. In Safari,
  // calling history.replaceState too frequently would cause a SecurityError
  // (DOM Exception). See comments around saveState for details. This is a step
  // to mitigate (but not eliminate) the problem.
  var highlightStatus = function (node, callback) {
    // It's pointless to highlight status on single status pages
    if (window.location.pathname.indexOf('/status/') === 0) {
      return
    }

    var $current = $('.status.focus').first()
    var $target
    var scroll = true
    if (node === 'prev') {
      if ($current.length === 0) {
        // No currently selected, target the last on-screen status
        $target = $('.status:onScreen').last()
        scroll = false
      } else {
        $target = $current.prevAll('.status').first()
        if ($target.length === 0) {
          // Already the first, just scroll to top and done
          $window.scrollTop(0)
          return
        }
      }
    } else if (node === 'next') {
      if ($current.length === 0) {
        // No currently selected, target the first on-screen status
        $target = firstOnScreenStatus()
        scroll = false
      } else {
        $target = $current.nextAll('.status').first()
        if ($target.length === 0) {
          // Already the last, just scroll to bottom and done
          $window.scrollTop($document.height())
          return
        }
      }
    } else {
      $target = $(document.getElementById(node))
      scroll = false
      if ($target.length === 0 || !$target.hasClass('status')) {
        throw new Error('Id \'' + node + '\' does not identify a status')
      }
    }
    if ($target.length === 0) {
      // No target, already the first (prev) or last (next)
      return
    }

    $current.removeClass('focus')
    $target.addClass('focus')

    // If prev or next, scroll to the target
    if (scroll) {
      $window.scrollTop($target.offset().top - 5)
    }

    if (callback) {
      callback($target.attr('id'))
    }
  }

  var dehighlightStatus = function () {
    $('.status.focus').removeClass('focus')
  }

  var toggleCommentsToggler = function (toggler, ensure) {
    var $toggler = $(toggler)
    var off = $toggler.hasClass('off')
    if ((off && ensure === 'off') || (!off && ensure === 'on')) {
      return
    }
    var text = $toggler.text()
    if (off) {
      $toggler.addClass('on').removeClass('off').text(text.replace('展开', '收起'))
    } else {
      $toggler.addClass('off').removeClass('on').text(text.replace('收起', '展开'))
    }
    $toggler.next().toggle()
  }

  var $globalCommentsToggler = $('#global-comments-toggler')

  var ensureGlobalCommentsTogglerState = function (targetState) {
    var currentlyOff = $globalCommentsToggler.hasClass('off')
    if ((currentlyOff && targetState === 'off') ||
        (!currentlyOff && targetState === 'on')) {
      // Nothing to do
      return
    }
    var text = $globalCommentsToggler.text()
    if (targetState === 'on') {
      $globalCommentsToggler.addClass('on').removeClass('off').text(text.replace('展开', '收起'))
    } else if (targetState === 'off') {
      $globalCommentsToggler.addClass('off').removeClass('on').text(text.replace('收起', '展开'))
    } else {
      throw new Error('ensureGlobalCommentsTogglerState: unknown targetState: ' + targetState)
    }
  }

  var toggleGlobalCommentsToggler = function () {
    var currentlyOff = $globalCommentsToggler.hasClass('off')
    var targetState = currentlyOff ? 'on' : 'off'

    // Toggle the #global-comments-toggler element
    ensureGlobalCommentsTogglerState(targetState)

    // Toggle each individual comments toggler
    // Select an on screen status to serve as a position mark; the
    // currently highlighted status (if any) is prioritized.
    var onScreenStatus = $('.status.focus:onScreen').get(0) || firstOnScreenStatus().get(0)
    if (onScreenStatus !== undefined) {
      var onScreenStatusRelativeOffset = onScreenStatus.offsetTop - $window.scrollTop()
    }
    $('.comments-toggler').each(function (i, e) {
      toggleCommentsToggler(e, targetState)
    })
    if (onScreenStatus !== undefined) {
      // Restore relative offset of the target on screen status pre-toggling
      $window.scrollTop(onScreenStatus.offsetTop - onScreenStatusRelativeOffset)
    }
    saveState()
  }

  var gatherState = function () {
    var state = {}
    // Collect comments toggler states
    state.commentTogglerStates = $('.comments-toggler').map(function (i, e) {
      var $e = $(e)
      return {
        id: $e.parent().attr('id'),
        on: $e.hasClass('on')
      }
    }).get()
    // Record id of currently highlighted status
    state.highlightedStatus = $('.status.focus').first().attr('id')
    // Record global comments toggler state
    state.globalCommentToggler = $('#global-comments-toggler').attr('class')
    // Record team split view toggler state (only on interactions/index.html)
    state.teamSplitView = $('#team-split-view').attr('class')
    // Record scroll position
    state.scroll = $window.scrollTop()
    // On /gallery, record currently open image (if any)
    if (window.location.pathname === '/gallery' && $.fancybox.isOpen) {
      state.currentlyOpenImage = $.fancybox.current.element.attr('href')
    }
    return state
  }

  // Note: saveState should be called at least once on each state to ensure all
  // required properties are defined. While it is attempting to do it in
  // init(), we CANNOT do that, because sometimes init() could be followed by
  // restoreState() (that is, during popstate handling), and we don't want to
  // overwrite the state before we restore it.
  //
  // Note2: Trying to save state frequently is problematic in Safari; it could
  // trigger the following DOM Exception:
  //
  //     SecurityError (DOM Exception 18): Attempt to use
  //     history.replaceState() more than 100 times per 30.000000 seconds
  //
  // This is actually pretty easy to trigger when holding down j or k in a list
  // of statuses.
  //
  // We can work around this by implementing a command queue that trickle
  // through, but I'm not it's worthwhile.
  var saveState = function () {
    window.history.replaceState(gatherState(), '')
  }

  var restoreState = function (state) {
    if (state === null) return
    $(state.commentTogglerStates).each(function (i, s) {
      var toggler = $('#' + s.id + ' > .comments-toggler').get(0)
      toggleCommentsToggler(toggler, s.on ? 'on' : 'off')
    })
    jiggle()
    if (state.highlightedStatus) {
      highlightStatus(state.highlightedStatus)
    }
    ensureGlobalCommentsTogglerState(state.globalCommentToggler)
    $('#team-split-view').attr('class', state.teamSplitView)
    $window.scrollTop(state.scroll)
    if (window.location.pathname === '/gallery' && state.currentlyOpenImage) {
      $('a[href="' + state.currentlyOpenImage + '"]').click()
    }
  }

  // Jiggle the scrolling position a little bit in order to trigger
  // lazyload re-evaluation.
  var jiggle = function () {
    if ($('img.lazy').length > 0) {
      var current = $window.scrollTop()
      $window.scrollTop(current - 1).scrollTop(current).scrollTop(current + 1).scrollTop(current)
    }
  }

  var loading = function () {
    $main.html('<div id="loading-center">加载中……</div>')
  }

  var onetimeInit = function () {
    // Push to the history stack
    myHistory.push(window.location.href)

    // Initialize the global comments toggler
    $('#global-comments-toggler').click(function () {
      toggleGlobalCommentsToggler()
      jiggle()
      saveState()
    })

    // Initialize toolbar menu hover effect
    $('.menu').hover(function () {
      $(this).children('ul').stop(true, false, true).slideToggle(300)
    })

    // Set audio volume to 20% in order not to startle people
    $('#audio').get(0).volume = 0.2

    // Initialize audio playback control
    $('#audio-control').click(function () {
      var $this = $(this)
      if ($this.hasClass('paused')) {
        $('#audio').get(0).play()
        $this.addClass('playing').removeClass('paused')
        $this.attr('title', '暂停音乐')
      } else {
        $('#audio').get(0).pause()
        $this.addClass('paused').removeClass('playing')
        $this.attr('title', '播放音乐')
      }
    })

    // Dehighlight status on click
    $document.click(function (e) {
      var clickedTag = e.target.tagName.toLowerCase()
      // Our <body> is only the first screenful of space; the rest is <html>
      if (clickedTag === 'html' || clickedTag === 'body') {
        dehighlightStatus()
        saveState()
      }
    })

    // Handle AJAX 404
    $.ajaxSetup({
      // Do not request script with a timestamped query parameter
      // See "Caching Responses" in https://api.jquery.com/jquery.getscript/
      cache: true,
      // Credit: http://stackoverflow.com/a/8287895/1944784
      beforeSend: function (jqXHR, settings) {
        jqXHR.requestUrl = settings.url
      },
      statusCode: {
        404: function (jqXHR) {
          // Ignore 404 of third party resources (analytics.js)
          if (jqXHR.requestUrl.indexOf('/') !== 0 && jqXHR.requestUrl.indexOf(sitePrefix) !== 0) {
            return
          }
          document.title = '嘟嘟宝贝 404'
          $main.empty().append($('<div id="loading-center">该页面不存在</div>'))
          // Initialize history state
          saveState()
        }
      }
    })

    // Feature & browser test the download attribute.
    //
    // Not supported on IE and Safari at the moment (Jan 2017)
    // http://caniuse.com/#search=download
    //
    // Firefox does support the download attribute but doesn't allow
    // cross-origin downloads, making it useless for us.
    //
    // Note that Safari is gaining the download attribute in Technology
    // Preview; but unfortunately, it has the same problem as Firefox:
    //
    // > The download attribute on anchor was ignored because its href URL has
    // > a different security origin.
    //
    // As such, we have to exclude Safari too.
    ;(function () {
      var $a = $('<a>')
      downloadAttributeSupported = $a.get(0).download !== undefined &&
        // Only Firefox defines InstallTrigger (hopefully)
        // http://stackoverflow.com/a/9851769/1944784
        typeof InstallTrigger === 'undefined' &&
        // Safari defines safari
        typeof safari === 'undefined'
      $a.remove()
    })()

    // Periodically record scroll position
    setInterval(function () {
      var state = window.history.state
      if (state !== null && state.scroll !== null) {
        var currentScroll = $window.scrollTop()
        if (currentScroll !== state.scroll) {
          state.scroll = currentScroll
          window.history.replaceState(state, '')
        }
      }
    }, 1000)
  }

  // These are inconsequential one-time init code that can be postponed
  var onetimeInitAsync = function () {
    // Fetch Google Analytics analytics.js
    if (gaTrackingId) {
      $.getScript('https://www.google-analytics.com/analytics.js')
      if (document.cookie === '') {
        // On first visit, display an alert
        document.cookie = 'visited=true; expires=Sat, 1 January 2050 00:00:00 UTC; path=/'
        var $gaAlert = $('<div id="ga-alert">本站使用Google Analytics记录访客基本地域及浏览器信息。' +
                         '详见<a href="/about#privacy">关于用户隐私</a>。</div>')
        $gaAlert.find('a').click(function () {
          $gaAlert.hide()
        })
        $gaAlert.hide().appendTo($('body'))
          .fadeIn(1000).delay(6000).fadeOut(1000, function () {
            $gaAlert.remove()
          })
      }
    }

    // Initialize tooltips
    var qtipStyle = {
      classes: 'qtip-light qtip-shadow tooltip'
    }
    var qtipPosition = {
      my: 'top center',
      at: 'bottom center'
    }

    $('[title!=""]').qtip({
      style: qtipStyle,
      position: qtipPosition
    })

    $('#audio-info').qtip({
      content: {
        text: '<p>《Du Du Baby》来自SNH48第十张迷你专辑《' +
          '<a href="http://www.snh48.com/event/s125/" target="_blank">新年这一刻</a>》，' +
          '由嘟嘟陈怡馨所在的H队演绎。这里播放的音频来自' +
          '<a href="http://source.snh48.com/mediasource/music/file/19190b96-c21c-4621-a57f-55691517bac8.mp3" ' +
          'target="_blank">source.snh48.com</a>，是官方移动应用“口袋48”所使用的、' +
          '供用户免费试听的地址（为优化音频加载速度，MP3文件已由320kbps压缩至128kbps）。' +
          '本站只作推荐，绝无盈利目的。请自觉支持正版音源。</p>' +
          '<p>请点击左侧的播放/暂停键控制音频播放。</p>'
      },
      style: qtipStyle,
      position: qtipPosition,
      hide: {
        fixed: true
      }
    })

    var switchToSina = $('#image-source-switcher').text().indexOf('新浪') !== -1
    $('#image-source-switcher').qtip({
      content: {
        // Help text doesn't really support custom domains set in conf.yml
        text: switchToSina
          ? '<p>您当前访问的dudubaby.org通过本站位于美国的服务器及百度云加速的缓存提供图片文件。' +
          '若图片加载过慢，请尝试点击“切换图源至新浪”访问cn.dudubaby.org' +
          '（完全相同的内容，但图片文件通过新浪微博的CDN提供，尤其适合中国大陆的用户）。' +
          '详见关于页“关于本站的图片源”一节。</p>'
          : '<p>您当前访问的cn.dudubaby.org通过新浪微博的CDN提供图片文件。' +
          '若图片失效，或图片加载过慢，请尝试点击“切换图源至本站”访问dudubaby.org' +
          '（完全相同的内容，但图片文件通过本站位于美国的服务器及百度云加速的缓存提供）。' +
          '详见关于页“关于本站的图片源”一节。</p>'
      },
      style: qtipStyle,
      position: qtipPosition
    })

    $('#help img').qtip({
      content: {
        text: '<p>若您想打开工具菜单，请将鼠标悬浮于左侧“工具”一栏上；' +
          '若您想打开快捷键帮助，请键盘输入问号（?）。' +
          '详情请见<a href="/about#guide">使用指南</a>。</p>' +
          '<p>若网页加载或显示有异常，很可能是浏览器兼容性问题，请下载最新版本的' +
          '<a href="https://www.google.com/chrome/" target="_blank">Google Chrome</a>、' +
          '<a href="https://www.mozilla.org/firefox/" target="_blank">Firefox</a>或' +
          '<a href="https://www.opera.com/" target="_blank">Opera</a>浏览器。' +
          '详情请见<a href="/about#technical">技术细节</a>。</p>'
      },
      style: qtipStyle,
      position: {
        my: 'bottom right',
        at: 'top left',
        adjust: {
          x: 6,
          y: 6
        }
      },
      hide: {
        fixed: true
      }
    })

    // Set keyboard shortcuts

    var hideCheatSheet = function () {
      $('#cheatsheet').remove()
      $('#page-cover').remove()
    }

    var showCheatSheet = function () {
      $('<div id="page-cover"></div>').appendTo($body).click(hideCheatSheet)
      $('<div id="cheatsheet">' +
        '<h2>快捷键帮助</h2>' +
        '<table class="keybindings">' +
        '<tr>' +
        '<td class="keys"><kbd>w</kbd> / <kbd>s</kbd></td>' +
        '<td class="desc">滚动至并突出上/下一条状态（单状态模式除外）</td>' +
        '<td class="keys"><kbd>k</kbd> / <kbd>j</kbd></td>' +
        '<td class="desc">同 <kbd>w</kbd> / <kbd>s</kbd></td>' +
        '</tr>' +
        '<tr>' +
        '<td class="keys"><kbd>a</kbd> / <kbd>d</kbd></td>' +
        '<td class="desc">大图模式内：上/下一张图片<br>大图模式外：上/下一页/月/条（全部/分月/单状态模式）</td>' +
        '<td class="keys"><kbd>,</kbd> / <kbd>.</kbd><br><kbd>&lt;</kbd> / <kbd>&gt;</kbd><br>' +
        '<kbd>&#x2190;</kbd> / <kbd>&#x2192;</kbd></td>' +
        '<td class="desc">同 <kbd>a</kbd> / <kbd>d</kbd></td>' +
        '</tr>' +
        '<tr>' +
        '<td class="keys"><kbd>o</kbd>' +
        '<td class="desc">进入或退出大图模式</td>' +
        '<td class="keys"><kbd>q</kbd> , <kbd>esc</kbd>' +
        '<td class="desc">退出大图模式</td>' +
        '</tr>' +
        '<tr>' +
        '<td class="keys"><kbd>O</kbd>' +
        '<td class="desc">打开原图<sup>1</sup>（限大图模式）</td>' +
        '<td class="keys"><kbd>D</kbd>' +
        '<td class="desc">下载原图<sup>2</sup>（限大图模式）</td>' +
        '</tr>' +
        '<td class="keys"><kbd>c</kbd>' +
        '<td class="desc">展开或收起当前状态的评论</td>' +
        '<td class="keys"><kbd>C</kbd>' +
        '<td class="desc">展开或收起所有状态的评论</td>' +
        '</tr>' +
        '</tr>' +
        '<td class="keys"><kbd>t</kbd> / <kbd>b</kbd>' +
        '<td class="desc">滚动至页面顶部/底部</td>' +
        '<td class="keys"><kbd>G</kbd> / <kbd>g</kbd><kbd>g</kbd>' +
        '<td class="desc">同 <kbd>t</kbd> / <kbd>b</kbd></td>' +
        '</tr>' +
        '<tr>' +
        '<td class="keys"><kbd>v</kbd>' +
        '<td class="desc">切换显示模式（限成员互动列表页）</td>' +
        '<td class="keys"><kbd>enter</kbd>' +
        '<td class="desc">进入图片相应状态（限画廊页大图模式）</td>' +
        '</tr>' +
        '<tr>' +
        '<td class="keys"><kbd>P</kbd></td>' +
        '<td class="desc">播放或暂停背景音乐</td>' +
        '<td class="keys"><kbd>z</kbd> / <kbd>x</kbd></td>' +
        '<td class="desc">后退/前进一页（任何页面）</td>' +
        '</tr>' +
        '<tr>' +
        '<td class="keys"><kbd>g</kbd><kbd>a</kbd>' +
        '<td class="desc">进入全部状态模式</td>' +
        '<td class="keys"><kbd>g</kbd><kbd>m</kbd>' +
        '<td class="desc">进入分月浏览模式</td>' +
        '</tr>' +
        '<tr>' +
        '<td class="keys"><kbd>g</kbd><kbd>s</kbd>' +
        '<td class="desc">进入单条状态模式</td>' +
        '<td class="keys"><kbd>g</kbd><kbd>i</kbd>' +
        '<td class="desc">进入成员互动模式</td>' +
        '</tr>' +
        '<tr>' +
        '<td class="keys"><kbd>g</kbd><kbd>G</kbd>' +
        '<td class="desc">进入画廊模式</td>' +
        '<td class="keys"><kbd>g</kbd><kbd>A</kbd>' +
        '<td class="desc">进入全部状态模式（单页）</td>' +
        '</tr>' +
        '<tr>' +
        '<td class="keys"><kbd>g</kbd>页码<kbd>enter</kbd>' +
        '<td class="desc">进入全部状态的指定页；页码为一到两位数，如<code>18</code>' +
        '<td class="keys"><kbd>g</kbd> <code>YYMM</code>' +
        '<td class="desc">进入指定月；月份为四位数，如<code>1501</code></td>' +
        '</tr>' +
        '<tr>' +
        '<td class="keys"><kbd>:</kbd>拼音<kbd>enter</kbd>' +
        '<td class="desc">进入与该成员的互动；拼音部分为拼音首字母，如李豆豆<code>ldd</code></td>' +
        '<td class="keys"><kbd>g</kbd><kbd>h</kbd>' +
        '<td class="desc">回到首页</td>' +
        '</tr>' +
        '<tr>' +
        '<td class="keys"><kbd>?</kbd></td>' +
        '<td class="desc">打开或关闭此帮助</td>' +
        '</tr>' +
        '</table>' +
        '<div class="footnote">' +
        '注：使用组合快捷键时，相邻两次按键间隔不可超过一秒<br>' +
        '若快捷键功能无效或有误，请检查是否有浏览器插件注册了相同的快捷键<br>' +
        '<sup>1</sup>部分浏览器会将打开的新标签页处理为弹窗并试图阻拦，如Firefox<br>' +
        '<sup>2</sup>部分浏览器不支持下载原图，如Safari、Firefox及IE' +
        '</div>').appendTo($body)
    }

    // w, k (vi) => highlight previous
    Mousetrap.bind(['w', 'k'], function () {
      highlightStatus('prev', saveState)
      return false
    })
    // s, j (vi) => highlight previous
    Mousetrap.bind(['s', 'j'], function () {
      highlightStatus('next', saveState)
      return false
    })
    // a, ',', <, left => previous page
    Mousetrap.bind(['a', ',', '<', 'left'], function () {
      $('.prev a').first().click()
      return false
    })
    // d, '.', >, right => next page
    Mousetrap.bind(['d', '.', '>', 'right'], function () {
      $('.next a').first().click()
      return false
    })
    // z => history back
    Mousetrap.bind('z', function () {
      if (myHistory.prev() !== null) {
        window.history.back()
      }
      return false
    })
    // x => history forward
    Mousetrap.bind('x', function () {
      if (myHistory.next() !== null) {
        window.history.forward()
      }
      return false
    })
    // o => open image gallery
    Mousetrap.bind('o', function () {
      // On the /gallery page
      var $gallery = $('#full-gallery')
      if ($gallery.length > 0) {
        var threshold = $window.scrollTop() - 30
        $gallery.find('img').filter(function (i, e) {
          // Find the first image that's mostly (75%) on screen by
          // filtering out those that are above the threshold (but not
          // filtering out the ones that are below viewport, since we're
          // taking the first one anyway).
          return e.offsetTop > threshold
        }).first().click()
        return false
      }

      currentStatus(function (e) {
        // Filter out statuses without galleries
        return $(e).find('.gallery').length > 0
      }).find('.gallery img').first().click()
      return false
    })
    // c => toggle comments
    Mousetrap.bind('c', function () {
      currentStatus().find('.comments-toggler').click()
      return false
    })
    // C => toggle comments globally
    Mousetrap.bind('C', function () {
      $('#global-comments-toggler').click()
      return false
    })
    // t, gg (vi) => page top
    Mousetrap.bind(['t', 'g g'], function () {
      $window.scrollTop(0)
      return false
    })
    // b, G (vi) => page bottom
    Mousetrap.bind(['b', 'G'], function () {
      $window.scrollTop($document.height())
      return false
    })
    // ga => /all/1
    Mousetrap.bind('g a', function () {
      $('.nav-right a').get(0).click()
      return false
    })
    // gm => /2016/12
    Mousetrap.bind('g m', function () {
      $('.nav-right a').get(1).click()
      return false
    })
    // gs => /status/<latest>
    Mousetrap.bind('g s', function () {
      $('.nav-right a').get(2).click()
      return false
    })
    // gi => /interactions/
    Mousetrap.bind('g i', function () {
      $('.nav-right a').get(3).click()
      return false
    })
    // gG => /gallery
    Mousetrap.bind('g G', function () {
      clickLink('/gallery')
      return false
    })
    // gA => /one-page
    Mousetrap.bind('g A', function () {
      clickLink('/one-page')
      return false
    })
    // gh => /
    Mousetrap.bind('g h', function () {
      $('.nav a').get(0).click()
      return false
    })
    // P => play/pause audio
    Mousetrap.bind('P', function () {
      $('#audio-control').click()
      return false
    })
    // ? => toggle cheatsheet
    Mousetrap.bind('?', function () {
      if ($('#cheatsheet').length === 0) {
        showCheatSheet()
      } else {
        hideCheatSheet()
      }
      return false
    })
    // ESC => hide cheatsheet
    Mousetrap.bind('escape', function () {
      if ($('#cheatsheet').length > 0) {
        hideCheatSheet()
      }
      return false
    })

    // /<year>/<month> specific
    // g YYMM => /<year>/<month>

    // Note: These need to be bound before /all/<pagenum>'s bindings, due to
    // the much dreaded mousetrap bug
    // https://github.com/ccampbell/mousetrap/issues/371.

    // Easier to hard code than to generate...
    var monthcodes = [
      '1407',
      '1408',
      '1409',
      '1410',
      '1411',
      '1412',
      '1501',
      '1502',
      '1503',
      '1504',
      '1505',
      '1506',
      '1507',
      '1508',
      '1509',
      '1510',
      '1511',
      '1512',
      '1601',
      '1602',
      '1603',
      '1604',
      '1605',
      '1606',
      '1607',
      '1608',
      '1609',
      '1610',
      '1611',
      '1612'
    ]
    $.each(monthcodes, function (i, monthcode) {
      // 1612 => g 1 6 1 2
      var binding = 'g' + monthcode.replace(/(.)/g, ' $1')
      var path = '/20' + monthcode.substr(0, 2) + '/' + monthcode.substr(2, 2)
      Mousetrap.bind(binding, function () {
        clickLink(path)
        return false
      })
    })

    // /all/* specific
    // g <pagenum> enter => /all/<pagenum>
    ;(function () {
      var maxPageNum = 22 // A const from data
      // Iterate in descending order due to
      // https://github.com/ccampbell/mousetrap/issues/371
      for (var page = maxPageNum; page > 0; page--) {
        var digit1 = Math.floor(page / 10)
        var digit2 = page % 10
        var bindings = ['g ' + digit1 + ' ' + digit2 + ' enter']
        if (digit1 === 0) {
          // Bind the single digit form in addition to the two digit form
          bindings.push('g ' + digit2 + ' enter')
        }
        Mousetrap.bind(bindings, (function (pagenum) {
          return function () {
            clickLink('/all/' + pagenum)
            return false
          }
        })(page))
      }
    })()

    // /interactions specific
    // v => toggle view on /interactions/
    Mousetrap.bind('v', function () {
      if (window.location.pathname.match(interactionsHomePattern)) {
        var $teamSplitView = $('#team-split-view')
        if ($teamSplitView.hasClass('mixed')) {
          $teamSplitView.removeClass('mixed').addClass('split')
        } else {
          $teamSplitView.removeClass('split').addClass('mixed')
        }
      }
      return false
    })

    // Have to hard code this...
    // Keys are ordered according to the number of interactions
    var namePinyins = {
      王璐: 'wl',
      李豆豆: 'ldd',
      吴燕文: 'wyw',
      徐伊人: 'xyr',
      刘炅然: 'ljr',
      李清扬: 'lqy',
      张昕: 'zx',
      沈梦瑶: 'smy',
      许杨玉琢: 'xyyz',
      谢妮: 'xn',
      徐晗: 'xh',
      卢静: 'lj',
      杨吟雨: 'yyy',
      林楠: 'ln',
      杨惠婷: 'yht',
      王露皎: 'wlj',
      刘佩鑫: 'lpx',
      王柏硕: 'wbs',
      郝婉晴: 'hwq',
      王晓佳: 'wxj',
      孙馨: 'sx',
      於佳怡: 'yjy',
      万丽娜: 'wln',
      张雨鑫: 'zyx',
      陈琳: 'cl',
      段艺璇: 'dyx',
      袁丹妮: 'ydn',
      袁航: 'yh',
      杨冰怡: 'yby',
      陈欣妤: 'cxy',
      李宇琪: 'lyq',
      陈问言: 'cwy',
      赵晔: 'zy',
      袁一琦: 'yyq',
      宋昕冉: 'sxr',
      王金铭: 'wjm',
      洪珮雲: 'hpy',
      张菡筱: 'zhx',
      刘力菲: 'llf',
      陈思: 'cs',
      刘菊子: 'ljz',
      孟玥: 'my',
      李艺彤: 'lyt',
      林思意: 'lsy',
      陈佳莹: 'cjy',
      孙珍妮: 'szn',
      张丹三: 'zds',
      张韵雯: 'zyw',
      李钊: 'lz',
      陈音: 'cy',
      冯雪莹: 'fxy',
      杜雨微: 'dyw',
      周淑妍: 'zsy',
      周秋均: 'zqj',
      曾琳瑜: 'zly',
      韩萌: 'hm',
      吴哲晗: 'wzh',
      张语格: 'zyg',
      徐子轩: 'xzx',
      温晶婕: 'wjj',
      莫寒: 'mh',
      许佳琪: 'xjq',
      铃木玛莉亚: 'lmmly',
      李璇: 'lx',
      王依君: 'wyj',
      龚诗淇: 'gsq',
      孙歆文: 'sxw',
      李晶: '' /* dupe, prioritize 卢静 */,
      汪佳翎: 'wjl',
      邵雪聪: 'sxc',
      严佼君: 'yjj',
      张文静: 'zwj',
      李佳恩: 'lje',
      孙姗: 'ss',
      徐佳丽: 'xjl',
      熊素君: 'xsj',
      闫明筠: 'ymj',
      易妍倩: '' /* dupe, prioritize 袁一琦 */,
      张凯祺: 'zkq',
      黄黎蓉: 'hlr',
      刘倩倩: 'lqq',
      陈慧婧: 'chj',
      康欣: 'kx',
      张曦尹: 'zxy',
      张馨方: 'zxf'
    }

    // : <pinyin acronym> enter => /interactions/<name>

    // The code could have been what is commented below, but due to
    // https://github.com/ccampbell/mousetrap/issues/371 we have to resort to
    // shenanigans to make sure we are binding keys in a "right" order.
    //
    // $.each(namePinyins, function (name, pinyin) {
    //   if (pinyin === '') {
    //     return
    //   }
    //   // 'ldd' => ': l d d enter'
    //   var binding = ': ' + pinyin.replace(/(.)/g, '$1 ') + 'enter'
    //   Mousetrap.bind(binding, function () {
    //     clickLink('/interactions/' + name)
    //   })
    // })
    ;(function () {
      var namePinyinPairs = []
      for (var name in namePinyins) {
        namePinyinPairs.push([name, namePinyins[name]])
      }
      namePinyinPairs.sort(function (a, b) {
        // Longer sequences first
        var aLen = a[1].length
        var bLen = b[1].length
        if (aLen > bLen) {
          return -1 // a < b
        } else if (aLen < bLen) {
          return 1 // a > b
        } else if (a[1] < b[1]) {
          return -1
        } else if (a[1] > b[1]) {
          return 1
        } else {
          return 0
        }
      })
      $.each(namePinyinPairs, function (i, entry) {
        var name = entry[0]
        var pinyin = entry[1]
        if (pinyin === '') {
          return
        }
        // 'ldd' => ': l d d enter'
        var binding = ': ' + pinyin.replace(/(.)/g, '$1 ') + 'enter'
        Mousetrap.bind(binding, function () {
          clickLink('/interactions/' + name)
          return false
        })
      })
    })()

    // Register all : ch1 ch2 combos that are not prefixes to one of the
    // functional combos as null.
    //
    // The intention here is to minimize the side effect of typos when trying
    // to invoke a : pinyin enter combo; as an example, previously typing :kz
    // would trigger the effect of z. We can't afford to register all
    // three-char sequences though, because that would degrade the performance
    // too much.
    //
    // Would have been a lot easier if Mousetrap had wildcard support, or
    // something comparable: https://github.com/ccampbell/mousetrap/issues/290.
    //
    // Maybe I should just write my own library...
    ;(function () {
      // Record two-char sequences (following :) that are already bound
      var bound = {}
      for (var name in namePinyins) {
        bound[namePinyins[name].substr(0, 2)] = true
      }
      var space = 32
      for (var ch1 = 97; ch1 <= 122; ch1++) {
        for (var ch2 = 97; ch2 <= 122; ch2++) {
          var seq = String.fromCharCode(ch1, ch2)
          if (!bound[seq]) {
            var binding = ': ' + String.fromCharCode(ch1, space, ch2) + ' enter'
            Mousetrap.bind(binding, null)
          }
        }
      }
    })()
  }

  // expectedGlobalCommentsTogglerState could be 'on' or 'off', or undefined
  // (in which case nothing is done either way)
  var init = function (expectedGlobalCommentsTogglerState) {
    // If we see an a#loading-center, immediately redirect to the target by simulating
    // a click.
    var $linkToLoad = $('a#loading-center')
    if ($linkToLoad.length) {
      // Set redirect to true in current state so that we can recognize this
      // intermediate redirect state if it's ever popped in the future
      window.history.replaceState({redirect: true}, '')
      $linkToLoad.click()
      return
    }

    // Highlight status on click
    $('.status').click(function () {
      highlightStatus(this.id, saveState)
    })

    // Lazyload, if applicable
    ;(function () {
      var $lazyimgs = $('img.lazy')
      $lazyimgs.lazyload({
        threshold: window.location.pathname === '/gallery' ? 360 : 800,
        placeholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQImWP4fXEuAAU0AmoyFe3zAAAAAElFTkSuQmCC'
      })
    })()

    // Fancybox

    // Add data-fancybox-group to fancybox images
    $('.status').each(function (i, e) {
      var $e = $(e)
      var id = $e.attr('id')
      $e.find('.gallery a.fancybox').attr('data-fancybox-group', id)
      $e.find('.comment a.fancybox').attr('data-fancybox-group', 'c:' + id)
    })
    // Only on /gallery
    $('#full-gallery a.fancybox').attr('data-fancybox-group', 'g')

    $('.fancybox').fancybox({
      nextClick: true,
      nextEffect: 'none',
      padding: 0,
      prevEffect: 'none',
      keys: {
        prev: [65, 188, 37], // a, ','/<, left
        next: [68, 190, 39], // d, '.'/>, right
        close: [27, 79, 81] // esc, o, q
      },
      helpers: {
        overlay: {
          locked: false
        }
      },
      beforeLoad: function () {
        var href = this.element.attr('href')
        var original
        if (href.indexOf('/assets/images/screenshots/') === 0) {
          original = href
        } else {
          var filename = this.element.find('img').attr('alt')
          original = 'http://' + sinaImgDomain() + '/large/' + filename
        }

        if (window.location.pathname === '/gallery') {
          // On /gallery page, use date as title, with link to the relevant status
          var date = this.element.attr('data-date')
          var link = '/status/' + this.element.attr('data-status-id')
          this.title = '<a id="status-link" href="' + link + '">' + date + '</a>'
        } else {
          this.title = (this.index + 1) + ' / ' + this.group.length
        }

        // Put an "open original" link on top.
        //
        // Also include a "download original" link if browser supports the
        // download attribute (no IE or Safari at the moment).
        //
        // Inspired by http://stackoverflow.com/q/25450224/1944784 and actually trying out
        // helpers: { title: { type: 'outside', position: 'top' } }
        var openOriginal = '<a id="open-original" href="' + original + '" target="_blank">查看原图</a>'
        var downloadOriginal = downloadAttributeSupported
            ? '<a id="download-original" href="' + original + '" download>下载原图</a>'
            : ''
        this.tpl.wrap = '<div class="fancybox-wrap" tabIndex="-1">' +
          '<div class="fancybox-title fancybox-title-outside-wrap view-original-link">' +
          openOriginal + downloadOriginal +
          '</div>' +
          '<div class="fancybox-skin">' +
          '<div class="fancybox-outer">' +
          '<div class="fancybox-inner"></div>' +
          '</div>' +
          '</div>' +
          '</div>'

        // The following should really be run once per open, but fancybox
        // doesn't have beforeOpen/afterOpen handlers, so we work with what we
        // have.

        // Pause other hotkeys
        Mousetrap.pause()
        // Register O => open original, D => download original, enter => open parent status
        $document.off('keypress.fancyboxOriginalLink')
        $document.on('keypress.fancyboxOriginalLink', function (e) {
          var key = String.fromCharCode(e.which)
          switch (key) {
            case 'O':
              // For whatever reason $('#open-original').click() doesn't work; we
              // need to use the DOM element's native click().
              //
              // Note that this could be treated as popup by the browser and
              // might be blocked (e.g. in Firefox).
              $('#open-original').get(0).click()
              break
            case 'D':
              $('#download-original').get(0).click()
              break
            case '\r':
              // Only applies to /gallery
              $('#status-link').click()
              break
          }
        })
      },
      afterShow: function () {
        // On /gallery, scroll page to the currently open image
        if (window.location.pathname === '/gallery') {
          var targetPosition = this.element.offset().top - 30
          var currentPosition = $window.scrollTop()
          // If current position is too far from the target
          if (Math.abs(currentPosition - targetPosition) >= 60) {
            $window.scrollTop(targetPosition)
          }
        }
        saveState()
      },
      beforeClose: function () {
        $document.off('keypress.fancyboxOriginalLink')
      },
      afterClose: function () {
        Mousetrap.unpause()
      }
    })

    // Gif overlay
    $('.fancybox[href$=".gif"]').addClass('gif-container')
      .append($('<div class="gif-indicator">GIF</div>'))

    // Highlight names in comments
    $('.comment span.name:contains("陈怡馨")').addClass('highlight-h2')
    var match = window.location.href.match(interactionsPagePattern)
    if (match) {
      var member = decodeURIComponent(match[1])
      var $badgedName = $('h1 .badged-name')
      if ($badgedName.length > 0) {
        var team = $badgedName.attr('class').split(' ')[1]
        $('.comment span.name:contains("' + member + '")').addClass('highlight-' + team)
      } else {
        console.warn('h1 .badged-name not found on ' + window.location.pathname)
      }
    }

    // (Re-)initialize the global comments toggler, if necessary
    if (expectedGlobalCommentsTogglerState !== undefined) {
      ensureGlobalCommentsTogglerState(expectedGlobalCommentsTogglerState)
    }

    // Initialize comment togglers
    $('.comments-toggler').click(function () {
      toggleCommentsToggler(this)
      jiggle()
      saveState()
      return false
    })

    // Enable back to top button
    $('.back-to-top').click(function () {
      $(window).scrollTop(0)
    })

    // Initialize team split view toggler (only on interactions/index.html)
    $('#mixed-button').click(function () {
      $('#team-split-view').attr('class', 'mixed')
    })

    $('#split-button').click(function () {
      $('#team-split-view').attr('class', 'split')
    })

    // Scroll to hash, if any
    scrollToHash(window.location.hash)

    // Remove the loading indicator, if any
    $('#loading-top').remove()
  }

  var updateTitle = function (html) {
    // html is the markup returned by an AJAX call, which should contain a
    // <title> tag
    var match = html.match(/<title>(.*?)<\/title>/)
    if (match !== null) {
      document.title = match[1].trim()
    }
  }

  $document.on('click', 'a', function (event) {
    // If clicked with a modifier, let it go through in order to respect
    // user's intention (e.g., Ctrl/Cmd+click to open in new tab).
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return true
    }

    var $this = $(this)
    if ($this.attr('target') === '_blank') return true
    var href = $this.attr('href')
    var absoluteHref = this.href
    if (!internalImagePattern.test(href) && !externalLinkPattern.test(href) &&
        !altProtocolPattern.test(href)) {
      if (window.history.state === null || !window.history.state.redirect) {
        // Only gather and record the current state if we're not in an
        // intermediate redirect state
        saveState()
      }

      // Do nothing if href is exactly the same as the current location
      if (absoluteHref === window.location.href) {
        return false
      }

      // Close out lingering fancybox
      $.fancybox.close()

      // Check if we can simply go back/forward
      var existing = myHistory.check(absoluteHref)
      if (existing === 'next') {
        window.history.forward()
        return false
      } else if (existing === 'prev') {
        window.history.back()
        return false
      }

      // Save the current and target URL base for later
      var currentUrlBase = urlWithoutHash(window.location.href)
      var targetUrlBase = urlWithoutHash(absoluteHref)

      // Push state, where the history stack and window.location change
      window.history.pushState({}, '', href)
      myHistory.push(absoluteHref)

      // See if we're linking within the same page
      if (currentUrlBase === targetUrlBase) {
        scrollToHash(this.hash)
        // Initialize history state
        saveState()
        return false
      }

      resendGaPageView()

      loading()
      // Can't use $main.load here because we want to fish out the expected
      // clean sheet state of the global-comments-toggler too, in addition to
      // main > * (e.g., it is expected to be off at the beginning on all/*,
      // but on at the beginning on interactions/*).
      //
      // Loosely modeled on $.fn.load:
      // https://github.com/jquery/jquery/blob/3bbcce68d7b8b8a7a2164a0f7a280ae9daf70b5c/src/ajax/load.js
      //
      // I'm not really sure if the out-of-tree throwaway elements we created
      // in the dummy div (e.g. we're creating a <nav> each time) would be
      // garbage collected automatically. load.js doesn't seem to be calling
      // remove or empty. Anyway, we manually throw it away just in case.
      loadingStart = window.performance ? window.performance.now() : 0
      $.get(href, function (html) {
        var $dummy = $('<div>').html(html)
        updateTitle(html)
        $main.empty().append($dummy.find('main > *'))
        init($dummy.find('#global-comments-toggler').attr('class'))
        sendGaTiming('xhr', 'load', loadingStart)
        // Initialize history state
        saveState()
        $dummy.remove()
      })
      return false
    } else {
      return true
    }
  })

  $(window).on('popstate', function (e) {
    resendGaPageView()

    var state = e.originalEvent.state

    // Check popstate direction
    var original = myHistory.current()
    var direction = myHistory.check()
    if (direction === 'prev') {
      // Back button pressed
      myHistory.back()
    } else if (direction === 'next') {
      // Forward button pressed
      myHistory.forward()
    } else if (original === window.location.href) {
      // Not sure why this would ever happen, but clearly we don't need
      // to do anything about it
      return
    } else if (urlWithoutHash(original) === urlWithoutHash(window.location.href)) {
      // URL not found in history stack, but just a hash change: this
      // means the hash change is manually initiated and not captured by
      // the onclick handler
      scrollToHash(window.location.hash)
      myHistory.push(window.location.href)
      // Initialize history state
      saveState()
    } else {
      // Unknown history state
      console.warn(window.location.href + ' popped but not in the history stack:\n' +
                   myHistory.toString() + '\nwith state ' + state)
      myHistory.clear()
      original = null
    }

    if (state !== null) {
      // Immediately pop another state if we're in an intermediate redirect state
      if (state.redirect) {
        if (direction === 'next' || myHistory.current_position() <= 0) {
          // myHistory.current_position <= 0 means we're at the bottom of the
          // stack; the stack started at this redirect state. In this case, we
          // have to go forward because as a policy we do not navigate out of
          // site boundary.
          window.history.forward()
        } else {
          window.history.back()
        }
        return
      }

      // Check if we're popping a hash-only change
      if (original) {
        if (urlWithoutHash(original) === urlWithoutHash(window.location.href)) {
          // Scroll to it, restore state, done
          scrollToHash(window.location.hash)
          restoreState(state)
          return
        }
      }

      loading()
      loadingStart = window.performance ? window.performance.now() : 0
      $main.load(window.location.href + ' main > *', function (html) {
        updateTitle(html)
        init()
        sendGaTiming('xhr', 'load', loadingStart)
        restoreState(state)
      })
    }
  })

  onetimeInit()
  setTimeout(onetimeInitAsync, 100)
  init()
  sendGaTiming('fresh', 'load', 0)
  // Initialize history state
  saveState()
})
