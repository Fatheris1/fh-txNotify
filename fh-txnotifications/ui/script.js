(function () {
    'use strict';

    var resourceName = (typeof GetParentResourceName === 'function')
        ? GetParentResourceName()
        : 'fh-txnotifications';

    var cfg = {
        position:             'top-center',
        announcementDuration: 10000,
        enableSound:          true,
        soundVolume:          0.5
    };

    var HIDE_MS = 340;

    var sfx = null;
    var audioCtx = null;

    try {
        sfx = new Audio('notifysound.mp3');
        sfx.preload = 'auto';
        sfx.volume = cfg.soundVolume;
        sfx.addEventListener('error', function () { sfx = null; });
        sfx.load();
    } catch (_) {
        sfx = null;
    }

    function getAudioCtx() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playSynthSound() {
        var ctx = getAudioCtx();
        var vol = cfg.soundVolume || 0.5;
        var now = ctx.currentTime;
        var tones = [880, 1174.66];

        tones.forEach(function (freq, i) {
            var start = now + i * 0.09;
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(Math.max(vol * 0.35, 0.01), start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.3);
        });
    }

    function playSound() {
        if (!cfg.enableSound) return;

        if (sfx) {
            var clip = sfx.cloneNode();
            clip.volume = cfg.soundVolume;
            var p = clip.play();
            if (p && typeof p.catch === 'function') {
                p.catch(playSynthSound);
                return;
            }
            return;
        }

        playSynthSound();
    }

    var annEl      = document.getElementById('ann');
    var annAuthor  = document.getElementById('ann-author');
    var annMsg     = document.getElementById('ann-msg');

    var rstEl      = document.getElementById('rst');
    var rstTimer   = document.getElementById('rst-timer');
    var rstMsg     = document.getElementById('rst-msg');
    var rstProg    = document.getElementById('rst-prog');

    var dmEl       = document.getElementById('dm');
    var dmAuthor   = document.getElementById('dm-author');
    var dmMsg      = document.getElementById('dm-msg');

    var warnEl       = document.getElementById('warn');
    var warnReason   = document.getElementById('warn-reason');
    var warnCount    = document.getElementById('warn-count');
    var warnHoldAuth = document.getElementById('warn-hold-author');
    var warnHoldFill = document.getElementById('warn-hold-fill');

    var annTO    = null;
    var dmTO     = null;
    var warnOpen = false;
    var holdIV   = null;
    var holdPct  = 0;
    var HOLD_MS  = 2000;
    var rstIV    = null;
    var rstSecs  = 0;

    var POSITIONS = {
        'top-left':      { top: '28px',   bottom: '',     left: '28px',  right: '',     transform: 'none',                 slideIn: 'translateY(-24px)', slideOut: 'translateY(-24px)' },
        'top-center':    { top: '28px',   bottom: '',     left: '50%',   right: '',     transform: 'translateX(-50%)',     slideIn: 'translateY(-24px)', slideOut: 'translateY(-24px)' },
        'top-right':     { top: '28px',   bottom: '',     left: '',      right: '28px', transform: 'none',                 slideIn: 'translateY(-24px)', slideOut: 'translateY(-24px)' },
        'center-left':   { top: '50%',    bottom: '',     left: '28px',  right: '',     transform: 'translateY(-50%)',     slideIn: 'translateX(-24px)', slideOut: 'translateX(-24px)' },
        'center':        { top: '50%',    bottom: '',     left: '50%',   right: '',     transform: 'translate(-50%,-50%)', slideIn: 'scale(0.95)',       slideOut: 'scale(0.95)' },
        'center-right':  { top: '50%',    bottom: '',     left: '',      right: '28px', transform: 'translateY(-50%)',     slideIn: 'translateX(24px)',  slideOut: 'translateX(24px)' },
        'bottom-left':   { top: '',       bottom: '52px', left: '28px',  right: '',     transform: 'none',                 slideIn: 'translateY(24px)',  slideOut: 'translateY(24px)' },
        'bottom-center': { top: '',       bottom: '52px', left: '50%',   right: '',     transform: 'translateX(-50%)',     slideIn: 'translateY(24px)',  slideOut: 'translateY(24px)' },
        'bottom-right':  { top: '',       bottom: '52px', left: '',      right: '28px', transform: 'none',                 slideIn: 'translateY(24px)',  slideOut: 'translateY(24px)' }
    };

    function applyPosition(el, pos) {
        var p = POSITIONS[pos] || POSITIONS['top-center'];
        el.style.top       = p.top;
        el.style.bottom    = p.bottom;
        el.style.left      = p.left;
        el.style.right     = p.right;
        el._transform = p.transform;
        el._slideIn   = p.slideIn;
        el._slideOut  = p.slideOut;
        el.style.transform = buildTransform(el, el._slideIn);
        el.style.opacity   = '0';
    }

    function buildTransform(el, slide) {
        var base = el._transform || '';
        if (!slide) return base || 'none';
        if (!base || base === 'none') return slide;
        return base + ' ' + slide;
    }

    function applyAllPositions() {
        applyPosition(annEl, cfg.position);
        applyPosition(dmEl,  cfg.position);
        applyPosition(rstEl, cfg.position);
    }

    function show(el) {
        el.classList.remove('hidden', 'hiding');
        void el.offsetWidth;
        el.style.transition = 'transform 0.46s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease';
        el.style.transform  = el._transform || 'none';
        el.style.opacity    = '1';
        el.classList.add('visible');
    }

    function hide(el, cb) {
        el.classList.remove('visible');
        el.style.transition = 'transform 0.32s cubic-bezier(0.7,0,1,0.45), opacity 0.22s ease';
        el.style.transform  = buildTransform(el, el._slideOut);
        el.style.opacity    = '0';
        el.classList.add('hiding');
        setTimeout(function () {
            el.classList.remove('hiding');
            el.classList.add('hidden');
            if (cb) cb();
        }, HIDE_MS);
    }

    function bar(barEl, ms) {
        barEl.style.transition = 'none';
        barEl.style.transform  = 'scaleX(1)';
        void barEl.offsetWidth;
        barEl.style.transition = 'transform ' + ms + 'ms linear';
        barEl.style.transform  = 'scaleX(0)';
    }

    function fmt(s) {
        if (s <= 0) return '0s';
        if (s < 60) return s + 's';
        var m = Math.floor(s / 60);
        var r = s % 60;
        return m + ':' + (r < 10 ? '0' : '') + r;
    }

    var countdownIVs = {};

    function startCountdown(el, id, ms) {
        var existing = el.querySelector('.ann__countdown');
        if (existing) existing.remove();
        if (countdownIVs[id]) { clearInterval(countdownIVs[id]); }

        var badge = document.createElement('span');
        badge.className = 'ann__countdown';
        el.appendChild(badge);

        var secs = Math.round(ms / 1000);
        badge.textContent = secs + 's';

        countdownIVs[id] = setInterval(function () {
            secs -= 1;
            if (secs <= 0) {
                clearInterval(countdownIVs[id]);
                delete countdownIVs[id];
                if (badge.parentNode) badge.remove();
            } else {
                badge.textContent = secs + 's';
            }
        }, 1000);
    }

    function showTimed(el, id, onShow) {
        if (id === 'ann' && annTO) { clearTimeout(annTO); annTO = null; }
        if (id === 'dm'  && dmTO)  { clearTimeout(dmTO);  dmTO  = null; }

        onShow();
        show(el);
        startCountdown(el, id, cfg.announcementDuration);

        var timeout = setTimeout(function () {
            hide(el);
            if (id === 'ann') annTO = null;
            if (id === 'dm')  dmTO  = null;
        }, cfg.announcementDuration);

        if (id === 'ann') annTO = timeout;
        if (id === 'dm')  dmTO  = timeout;
    }

    function showAnn(d) {
        showTimed(annEl, 'ann', function () {
            annAuthor.textContent = d.author  || 'txAdmin';
            annMsg.textContent    = d.message || '';
            playSound();
        });
    }

    function showRst(d) {
        rstSecs = Math.max(0, d.secondsRemaining || 0);
        if (rstIV) { clearInterval(rstIV); rstIV = null; }
        rstTimer.textContent = fmt(rstSecs);
        rstMsg.textContent   = d.message || '';
        playSound();
        show(rstEl);
        bar(rstProg, rstSecs * 1000);
        rstIV = setInterval(function () {
            rstSecs -= 1;
            rstTimer.textContent = fmt(rstSecs);
            if (rstSecs <= 0) {
                clearInterval(rstIV); rstIV = null;
                setTimeout(function () { hide(rstEl); }, 1500);
            }
        }, 1000);
    }

    function showDm(d) {
        showTimed(dmEl, 'dm', function () {
            dmAuthor.textContent = d.author  || 'txAdmin';
            dmMsg.textContent    = d.message || '';
            playSound();
        });
    }

    function dismissWarn() {
        if (!warnOpen) return;
        warnOpen = false;

        if (holdIV) { clearInterval(holdIV); holdIV = null; }
        holdPct = 0;
        warnHoldFill.style.width = '0%';

        warnEl.classList.remove('visible');
        warnEl.classList.add('hiding');
        setTimeout(function () {
            warnEl.classList.remove('hiding');
            warnEl.classList.add('hidden');
        }, 300);

        fetch('https://' + resourceName + '/warnDismissed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
    }

    function showWarn(d) {
        warnReason.textContent   = d.reason || '';
        warnHoldAuth.textContent = d.author || 'txAdmin';
        warnCount.textContent    = d.warnCount || 1;

        holdPct = 0;
        warnHoldFill.style.width = '0%';

        playSound();

        warnEl.classList.remove('hidden', 'hiding');
        void warnEl.offsetWidth;
        warnEl.classList.add('visible');
        warnOpen = true;
    }

    window.addEventListener('keydown', function (e) {
        if (e.code !== 'Space' || !warnOpen) return;
        e.preventDefault();

        if (holdIV) return;

        var step = 100 / (HOLD_MS / 50);
        holdIV = setInterval(function () {
            holdPct += step;
            warnHoldFill.style.width = Math.min(holdPct, 100) + '%';
            if (holdPct >= 100) {
                clearInterval(holdIV);
                holdIV = null;
                dismissWarn();
            }
        }, 50);
    });

    window.addEventListener('keyup', function (e) {
        if (e.code !== 'Space') return;
        if (holdIV) {
            clearInterval(holdIV);
            holdIV = null;
        }
        holdPct = 0;
        warnHoldFill.style.width = '0%';
    });

    window.addEventListener('message', function (e) {
        var d = e.data || {};
        switch (d.action) {
            case 'config':
                cfg.position             = d.payload.position             || cfg.position;
                cfg.announcementDuration = d.payload.announcementDuration || cfg.announcementDuration;
                if (d.payload.enableSound !== undefined) {
                    cfg.enableSound = !!d.payload.enableSound;
                }
                if (d.payload.soundVolume !== undefined) {
                    cfg.soundVolume = Math.min(1, Math.max(0, d.payload.soundVolume));
                    if (sfx) sfx.volume = cfg.soundVolume;
                }
                applyAllPositions();
                break;
            case 'announcement':
                showAnn(d.payload || {});
                break;
            case 'restart':
                showRst(d.payload || {});
                break;
            case 'dm':
                showDm(d.payload || {});
                break;
            case 'warn':
                showWarn(d.payload || {});
                break;
        }
    });

    applyAllPositions();

}());
