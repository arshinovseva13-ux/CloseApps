        // ===== ВРЕМЯ =====
        function updateLocalTime() {
            try {
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                document.getElementById('localTime').textContent = hours + ':' + minutes;
                
                const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const shortTZ = timeZone.split('/').pop().replace('_', ' ');
                document.getElementById('timeZoneLabel').textContent = shortTZ;
            } catch(e) { console.error('Time error:', e); }
        }
        updateLocalTime();
        setInterval(updateLocalTime, 1000);

        // ===== РЕЙТИНГИ =====
        const RATING_KEY = 'closeAppsRatings';
        let ratings = {};
        try { ratings = JSON.parse(localStorage.getItem(RATING_KEY)) || {}; } catch(e) { ratings = {}; }

        function saveRatings() {
            try { localStorage.setItem(RATING_KEY, JSON.stringify(ratings)); } catch(e) {}
        }

        function updateStarsDisplay(container, value) {
            const stars = container.querySelectorAll('.star');
            stars.forEach(s => {
                const v = parseInt(s.getAttribute('data-value'));
                s.classList.toggle('filled', v <= value);
            });
            const valueEl = container.querySelector('.rating-value');
            if (valueEl) valueEl.textContent = value > 0 ? value.toFixed(1) : '0.0';
        }

        function initRatings() {
            document.querySelectorAll('.rating').forEach(ratingEl => {
                const appId = ratingEl.getAttribute('data-app-id');
                const savedValue = ratings[appId] || 0;
                updateStarsDisplay(ratingEl, savedValue);

                const stars = ratingEl.querySelectorAll('.star');
                stars.forEach(star => {
                    star.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        const value = parseInt(this.getAttribute('data-value'));
                        ratings[appId] = value;
                        saveRatings();
                        updateStarsDisplay(ratingEl, value);
                    });
                });
            });
        }
        initRatings();

        // ===== КАТЕГОРИИ =====
        const categoryButtons = document.querySelectorAll('.category-btn');
        let currentCategory = 'all';

        categoryButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                categoryButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentCategory = this.getAttribute('data-category');
                applyFilters();
            });
        });

        // ===== ПОИСК =====
        const searchInput = document.getElementById('searchInput');
        const appLinks = document.querySelectorAll('.app-link, .article-link');
        const noResults = document.getElementById('noResults');

        function applyFilters() {
            const query = searchInput.value.toLowerCase().trim();
            let visibleCount = 0;

            appLinks.forEach(link => {
                const searchData = link.getAttribute('data-search') || '';
                const title = link.querySelector('.link-title').textContent.toLowerCase();
                const desc = link.querySelector('.link-desc') ? link.querySelector('.link-desc').textContent.toLowerCase() : '';
                const category = link.getAttribute('data-category') || '';

                const matchesSearch = query === '' || searchData.indexOf(query) !== -1 || title.indexOf(query) !== -1 || desc.indexOf(query) !== -1;
                const matchesCategory = currentCategory === 'all' || category === currentCategory;

                if (matchesSearch && matchesCategory) {
                    link.classList.remove('hidden');
                    visibleCount++;
                } else {
                    link.classList.add('hidden');
                }
            });

            noResults.classList.toggle('show', visibleCount === 0 && (query !== '' || currentCategory !== 'all'));
        }

        searchInput.addEventListener('input', applyFilters);

        // Третий фрагмент появляется после поиска фразы «15 приложений».
        const fifteenSearchEgg = document.getElementById('fifteenSearchEgg');
        if (fifteenSearchEgg) {
            const updateFifteenSearchEgg = () => {
                const query = searchInput.value.toLowerCase().replace(/\\s+/g, ' ').trim();
                fifteenSearchEgg.style.display = query.includes('15 приложений') ? 'flex' : 'none';
            };
            searchInput.addEventListener('input', updateFifteenSearchEgg);
            updateFifteenSearchEgg();
            fifteenSearchEgg.addEventListener('click', () => {
                const code = 'FIFTEEN-2027';
                let saved = [];
                try { saved = JSON.parse(localStorage.getItem('closeAppsVaultCodes') || '[]'); } catch (_) {}
                if (!saved.includes(code)) saved.push(code);
                try { localStorage.setItem('closeAppsVaultCodes', JSON.stringify(saved)); } catch (_) {}

                let notice = document.getElementById('fifteenCodeNotice');
                if (!notice) {
                    notice = document.createElement('div');
                    notice.id = 'fifteenCodeNotice';
                    notice.style.cssText = 'position:fixed;inset:0;z-index:100001;display:grid;place-items:center;padding:18px;background:rgba(3,5,14,.82);backdrop-filter:blur(10px);font-family:Inter,system-ui,sans-serif;color:#eef2ff;';
                    notice.innerHTML = '<section style="width:min(390px,100%);box-sizing:border-box;padding:25px;border:1px solid #51458d;border-radius:20px;background:linear-gradient(145deg,#17172b,#0b1020);box-shadow:0 25px 100px #0009;text-align:center"><div style="font-size:28px">✦</div><div style="margin:10px 0;color:#a7a0ff;font-size:11px;font-weight:800;letter-spacing:2px">FRAGMENT FOUND</div><h2 style="margin:8px 0 10px;font-size:22px">Третий фрагмент найден</h2><p style="color:#aab2d0;font-size:14px;line-height:1.5">Код доступа:</p><code style="display:block;padding:13px;border:1px solid #34375e;border-radius:10px;background:#090d1a;color:#b6f3ff;font-size:16px;font-weight:800;letter-spacing:1px">FIFTEEN-2027</code><button type="button" style="margin-top:16px;padding:11px 18px;border:0;border-radius:10px;background:linear-gradient(100deg,#7c5cff,#3ca8ff);color:white;font-weight:800;cursor:pointer">Понятно</button></section>';
                    document.body.appendChild(notice);
                    notice.querySelector('button').addEventListener('click', () => notice.remove());
                    notice.addEventListener('click', e => { if (e.target === notice) notice.remove(); });
                }
            });
        }

        // ===== НЕДАВНО ПРОСМОТРЕННЫЕ =====
        const RECENT_KEY = 'closeAppsRecent';
        const MAX_RECENT = 5;

        function getRecent() {
            try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch(e) { return []; }
        }

        function addToRecent(appId) {
            let recent = getRecent();
            recent = recent.filter(id => id !== appId);
            recent.unshift(appId);
            if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
            try { localStorage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch(e) {}
            renderRecent();
        }

        function renderRecent() {
            const recent = getRecent();
            const section = document.getElementById('recentSection');
            const list = document.getElementById('recentList');
            
            if (recent.length === 0) {
                section.classList.remove('show');
                return;
            }

            section.classList.add('show');
            list.innerHTML = '';

            recent.forEach(appId => {
                const link = document.querySelector('[data-id="' + appId + '"]');
                if (!link) return;
                
                const icon = link.getAttribute('data-icon');
                const title = link.getAttribute('data-title');
                
                const item = document.createElement('a');
                item.href = '#';
                item.className = 'recent-item';
                item.innerHTML = '<span class="recent-icon">' + icon + '</span><span>' + title + '</span>';
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    openModal(link);
                });
                list.appendChild(item);
            });
        }
        renderRecent();

        // ===== МОДАЛЬНОЕ ОКНО =====
        const modalOverlay = document.getElementById('modalOverlay');
        const modalIcon = document.getElementById('modalIcon');
        const modalTitle = document.getElementById('modalTitle');
        const modalBadges = document.getElementById('modalBadges');
        const modalDescription = document.getElementById('modalDescription');
        const modalUrl = document.getElementById('modalUrl');
        const modalCategory = document.getElementById('modalCategory');
        const modalStars = document.getElementById('modalStars');
        const modalOpenBtn = document.getElementById('modalOpenBtn');
        let currentAppId = null;

        const categoryNames = {
            games: '🎮 Игры',
            tools: '🛠️ Инструменты',
            education: '📚 Обучение',
            other: '📦 Разное'
        };

        function openModal(linkEl) {
            const id = linkEl.getAttribute('data-id');
            const icon = linkEl.getAttribute('data-icon');
            const title = linkEl.getAttribute('data-title');
            const desc = linkEl.getAttribute('data-desc');
            const url = linkEl.getAttribute('data-url');
            const urlDisplay = linkEl.getAttribute('data-url-display');
            const category = linkEl.getAttribute('data-category');
            const badgesRaw = linkEl.getAttribute('data-badges');

            currentAppId = id;

            modalIcon.textContent = icon;
            modalTitle.textContent = title;
            modalDescription.textContent = desc;
            modalUrl.textContent = urlDisplay;
            modalCategory.textContent = categoryNames[category] || '—';
            modalOpenBtn.href = url;

            modalBadges.innerHTML = '';
            if (badgesRaw) {
                try {
                    const badges = JSON.parse(badgesRaw);
                    badges.forEach(b => {
                        const span = document.createElement('span');
                        span.className = 'link-badge ' + b.class;
                        span.textContent = b.text;
                        modalBadges.appendChild(span);
                    });
                } catch (e) {}
            }

            const savedValue = ratings[id] || 0;
            updateModalStars(savedValue);

            modalOverlay.classList.add('show');
            document.body.style.overflow = 'hidden';

            addToRecent(id);
        }

        function updateModalStars(value) {
            modalStars.querySelectorAll('.modal-star').forEach(s => {
                const v = parseInt(s.getAttribute('data-value'));
                s.classList.toggle('filled', v <= value);
            });
        }

        modalStars.querySelectorAll('.modal-star').forEach(star => {
            star.addEventListener('click', function() {
                const value = parseInt(this.getAttribute('data-value'));
                if (currentAppId) {
                    ratings[currentAppId] = value;
                    saveRatings();
                    updateModalStars(value);
                    
                    const cardRating = document.querySelector('.rating[data-app-id="' + currentAppId + '"]');
                    if (cardRating) updateStarsDisplay(cardRating, value);
                }
            });
        });

        function closeModal() {
            modalOverlay.classList.remove('show');
            document.body.style.overflow = '';
        }

        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) closeModal();
        });

        appLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                openModal(this);
            });
        });

        // ===== ИСТОРИЯ ОБНОВЛЕНИЙ =====
        const changelogHeader = document.getElementById('changelogHeader');
        const changelogContent = document.getElementById('changelogContent');
        const changelogToggle = document.getElementById('changelogToggle');
        let isChangelogOpen = true;

        changelogHeader.addEventListener('click', function() {
            isChangelogOpen = !isChangelogOpen;
            
            if (isChangelogOpen) {
                changelogContent.classList.add('expanded');
                changelogToggle.classList.add('open');
                changelogToggle.textContent = '▼';
            } else {
                changelogContent.classList.remove('expanded');
                changelogToggle.classList.remove('open');
                changelogToggle.textContent = '▲';
            }
        });

        // ===== ПАСХАЛКА-ЗВЁЗДОЧКА =====
        const easterTrigger = document.getElementById('easterEggTrigger');
        const easterPopup = document.getElementById('easterPopup');
        const easterPopupOverlay = document.getElementById('easterPopupOverlay');
        const popupClose = document.getElementById('popupClose');

        easterTrigger.addEventListener('click', function() {
            easterPopupOverlay.classList.add('show');
            easterPopup.classList.add('show');
            document.body.style.overflow = 'hidden';
            startFireworks();
            try { localStorage.setItem('closeAppsEasterEggFound', 'true'); } catch(e) {}
        });

        function closeEasterPopup() {
            easterPopup.classList.remove('show');
            easterPopupOverlay.classList.remove('show');
            document.body.style.overflow = '';
            stopFireworks();
        }

        popupClose.addEventListener('click', closeEasterPopup);
        easterPopupOverlay.addEventListener('click', closeEasterPopup);

        // ===== САЛЮТ =====
        const fireworksCanvas = document.getElementById('fireworksCanvas');
        const fctx = fireworksCanvas.getContext('2d');
        let fireworks = [];
        let fireworksAnimation = null;
        let fireworksActive = false;

        function resizeFireworks() {
            fireworksCanvas.width = window.innerWidth;
            fireworksCanvas.height = window.innerHeight;
        }
        resizeFireworks();
        window.addEventListener('resize', resizeFireworks);

        function FireworkParticle(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.life = 1;
            this.decay = 0.015 + Math.random() * 0.015;
            this.size = Math.random() * 2.5 + 1;
            this.gravity = 0.05;
            this.friction = 0.98;
        }
        FireworkParticle.prototype.update = function() {
            this.vx *= this.friction;
            this.vy *= this.friction;
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            this.life -= this.decay;
        };
        FireworkParticle.prototype.draw = function(ctx) {
            ctx.globalAlpha = Math.max(0, this.life);
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        };

        function createExplosion(x, y) {
            const colors = ['#ffd700', '#ff9a3c', '#ff5e9c', '#8b6cff', '#00d4ff', '#00ff8c', '#ffffff'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const count = 40 + Math.floor(Math.random() * 30);
            for (let i = 0; i < count; i++) {
                fireworks.push(new FireworkParticle(x, y, color));
            }
        }

        function animateFireworks() {
            if (!fireworksActive) return;
            
            fctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            fctx.fillRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);

            if (Math.random() < 0.08) {
                const x = Math.random() * fireworksCanvas.width;
                const y = Math.random() * fireworksCanvas.height * 0.6 + 50;
                createExplosion(x, y);
            }

            for (let i = fireworks.length - 1; i >= 0; i--) {
                fireworks[i].update();
                fireworks[i].draw(fctx);
                if (fireworks[i].life <= 0) {
                    fireworks.splice(i, 1);
                }
            }
            fctx.globalAlpha = 1;
            fctx.shadowBlur = 0;

            fireworksAnimation = requestAnimationFrame(animateFireworks);
        }

        function startFireworks() {
            if (fireworksActive) return;
            fireworksActive = true;
            fireworksCanvas.classList.add('show');
            const cx = fireworksCanvas.width / 2;
            const cy = fireworksCanvas.height * 0.35;
            createExplosion(cx, cy);
            setTimeout(function() { createExplosion(cx - 150, cy + 50); }, 200);
            setTimeout(function() { createExplosion(cx + 150, cy + 50); }, 400);
            
            fctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
            animateFireworks();
        }

        function stopFireworks() {
            fireworksActive = false;
            if (fireworksAnimation) {
                cancelAnimationFrame(fireworksAnimation);
                fireworksAnimation = null;
            }
            fctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
            fireworksCanvas.classList.remove('show');
            fireworks = [];
        }

        // ===== ПАСХАЛКА-ТЕРМИНАЛ =====
        const terminalOverlay = document.getElementById('terminalOverlay');
        const terminalBody = document.getElementById('terminalBody');
        const terminalInput = document.getElementById('terminalInput');
        const terminalClose = document.getElementById('terminalClose');
        const terminalEggTrigger = document.getElementById('terminalEggTrigger');
        let commandHistory = [];
        let historyIndex = -1;
        let terminalOpen = false;
        let terminalInitialized = false;

        function printLine(text, type) {
            type = type || '';
            const line = document.createElement('div');
            line.className = 'terminal-line' + (type ? ' ' + type : '');
            line.textContent = text;
            terminalBody.appendChild(line);
            terminalBody.scrollTop = terminalBody.scrollHeight;
        }


        // Изолированная панель фрагментов доступа. Команда не выводится в справке.
        function openCodePanel() {
            let overlay = document.getElementById('closeCodePanel');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'closeCodePanel';
                overlay.innerHTML = `
                  <style>
                    #closeCodePanel{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:18px;background:rgba(3,5,14,.84);backdrop-filter:blur(12px);font-family:Inter,system-ui,sans-serif;color:#eef2ff}
                    #closeCodePanel .cc-card{width:min(460px,100%);box-sizing:border-box;border:1px solid #34375e;border-radius:22px;padding:25px;background:linear-gradient(145deg,#17172b,#0b1020);box-shadow:0 25px 100px #0009}
                    #closeCodePanel .cc-top{display:flex;justify-content:space-between;align-items:center;gap:12px}
                    #closeCodePanel .cc-label{font-size:11px;letter-spacing:2.5px;color:#a7a0ff;font-weight:800}
                    #closeCodePanel .cc-close{border:0;background:#ffffff12;color:#cdd1e8;border-radius:10px;padding:8px 11px;cursor:pointer}
                    #closeCodePanel h2{font-size:25px;margin:16px 0 8px;letter-spacing:-.6px}
                    #closeCodePanel p{color:#aab2d0;line-height:1.55;font-size:14px}
                    #closeCodePanel .cc-input{box-sizing:border-box;width:100%;margin-top:10px;padding:14px 15px;border:1px solid #44446f;border-radius:12px;background:#090d1a;color:white;font:600 14px ui-monospace,monospace;outline:none}
                    #closeCodePanel .cc-input:focus{border-color:#a18cff;box-shadow:0 0 0 3px #927aff20}
                    #closeCodePanel .cc-submit{width:100%;margin-top:10px;padding:13px;border:0;border-radius:12px;background:linear-gradient(100deg,#7c5cff,#3ca8ff);color:white;font-weight:800;cursor:pointer}
                    #closeCodePanel .cc-status{min-height:22px;margin-top:13px;font-size:13px;color:#b6c0df}
                    #closeCodePanel .cc-progress{display:flex;gap:7px;margin-top:15px}
                    #closeCodePanel .cc-dot{height:5px;flex:1;border-radius:8px;background:#292d45}
                    #closeCodePanel .cc-dot.on{background:linear-gradient(90deg,#8b70ff,#4cc9f0);box-shadow:0 0 12px #8170ff66}
                    #closeCodePanel .cc-link{display:block;text-align:center;margin-top:14px;padding:13px;border:1px solid #5f55a8;border-radius:12px;color:#fff;text-decoration:none;background:#7560ff20;font-weight:800}
                    @media(max-width:420px){#closeCodePanel .cc-card{padding:20px}#closeCodePanel h2{font-size:22px}}
                  </style>
                  <section class="cc-card" role="dialog" aria-modal="true" aria-labelledby="ccTitle">
                    <div class="cc-top"><span class="cc-label">CLOSE / ACCESS CONTROL</span><button class="cc-close" type="button" aria-label="Закрыть">✕</button></div>
                    <h2 id="ccTitle">Сборка доступа</h2>
                    <p>Введи найденный фрагмент. Порядок не важен. Прогресс сохранится в этом браузере.</p>
                    <form class="cc-form"><input class="cc-input" autocomplete="off" spellcheck="false" placeholder="Вставь код фрагмента" aria-label="Код фрагмента"><button class="cc-submit" type="submit">Проверить фрагмент</button></form>
                    <div class="cc-progress" aria-label="Прогресс"><span class="cc-dot"></span><span class="cc-dot"></span><span class="cc-dot"></span></div>
                    <div class="cc-status" role="status" aria-live="polite"></div>
                    <a class="cc-link" href="vault.html" hidden>Открыть CLOSE // ZERO ↗</a>
                  </section>`;
                document.body.appendChild(overlay);
                overlay.querySelector('.cc-close').addEventListener('click', () => overlay.remove());
                overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
                overlay.querySelector('.cc-form').addEventListener('submit', e => {
                    e.preventDefault();
                    const input = overlay.querySelector('.cc-input');
                    const status = overlay.querySelector('.cc-status');
                    const known = ['STARFINDER-2026','TERMINAL-2026','FIFTEEN-2027'];
                    const value = input.value.trim().toUpperCase();
                    if (!known.includes(value)) {
                        status.textContent = 'Фрагмент не распознан. Проверь написание.';
                        status.style.color = '#ff9aa9';
                        input.select();
                        return;
                    }
                    let saved = [];
                    try { saved = JSON.parse(localStorage.getItem('closeAppsVaultCodes') || '[]'); } catch(_) {}
                    if (!saved.includes(value)) saved.push(value);
                    try { localStorage.setItem('closeAppsVaultCodes', JSON.stringify(saved)); } catch(_) {}
                    const count = known.filter(k => saved.includes(k)).length;
                    overlay.querySelectorAll('.cc-dot').forEach((dot, i) => dot.classList.toggle('on', i < count));
                    if (count === known.length) {
                        status.textContent = 'Доступ подтверждён. Архив готов к открытию.';
                        status.style.color = '#7cf5c0';
                        overlay.querySelector('.cc-link').hidden = false;
                        overlay.querySelector('.cc-submit').textContent = 'Все фрагменты приняты';
                        overlay.querySelector('.cc-input').disabled = true;
                    } else {
                        status.textContent = 'Фрагмент принят · ' + count + ' из 3';
                        status.style.color = '#a9f5d0';
                        input.value = '';
                        input.focus();
                    }
                });
            }
            let saved = [];
            try { saved = JSON.parse(localStorage.getItem('closeAppsVaultCodes') || '[]'); } catch(_) {}
            const known = ['STARFINDER-2026','TERMINAL-2026','FIFTEEN-2027'];
            const count = known.filter(k => saved.includes(k)).length;
            overlay.querySelectorAll('.cc-dot').forEach((dot, i) => dot.classList.toggle('on', i < count));
            const status = overlay.querySelector('.cc-status');
            const input = overlay.querySelector('.cc-input');
            const link = overlay.querySelector('.cc-link');
            if (count === known.length) {
                status.textContent = 'Доступ подтверждён. Архив готов к открытию.';
                status.style.color = '#7cf5c0';
                link.hidden = false;
                overlay.querySelector('.cc-submit').textContent = 'Все фрагменты приняты';
                input.disabled = true;
            } else {
                status.textContent = count ? 'Сохранено фрагментов: ' + count + ' из 3' : 'Ожидание первого фрагмента…';
                link.hidden = true;
            }
            if (!input.disabled) setTimeout(() => input.focus(), 40);
        }

        const commands = {
            help: function() {
                printLine('Доступные команды:', 'info');
                printLine('');
                printLine('  help              — показать это сообщение');
                printLine('  about             — информация о хабе');
                printLine('  apps              — список всех приложений');
                printLine('  articles          — список текстовых статей');
                printLine('  dev               — что сейчас в разработке');
                printLine('  stats             — статистика хаба');
                printLine('  date              — текущая дата и время');
                printLine('  whoami            — кто ты в этой системе');
                printLine('  clear             — очистить экран');
                printLine('  exit              — закрыть терминал');
                printLine('');
                printLine('');
                printLine('Некоторые возможности системы не отображаются в справке.', 'dim');
            },
            about: function() {
                printLine('Close Приложения — дочерняя компания MD2.', 'success');
                printLine('Мы создаём веб-приложения: игры, инструменты, обучение.');
                printLine('Хаб: arshinovseva13-ux.github.io/CloseApps/', 'dim');
            },
            apps: function() {
                printLine('Все приложения (' + document.querySelectorAll('.app-link').length + '):', 'info');
                const apps = document.querySelectorAll('.app-link');
                apps.forEach(function(app, i) {
                    const title = app.getAttribute('data-title');
                    const icon = app.getAttribute('data-icon');
                    printLine('  ' + (i + 1) + '. ' + icon + ' ' + title);
                });
            },
            articles: function() {
                printLine('Текстовые статьи (5):', 'info');
                const articles = document.querySelectorAll('.article-link');
                articles.forEach(function(art, i) {
                    const title = art.getAttribute('data-title');
                    const icon = art.getAttribute('data-icon');
                    printLine('  ' + (i + 1) + '. ' + icon + ' ' + title);
                });
            },
            dev: function() {
                printLine('Сейчас в разработке: Статья по ЛДПР', 'warn');
                printLine('Ожидайте обновлений!', 'dim');
            },
            stats: function() {
                const apps = document.querySelectorAll('.app-link').length;
                const articles = document.querySelectorAll('.article-link').length;
                printLine('Статистика хаба:', 'info');
                printLine('  Приложений: ' + apps);
                printLine('  Статей: ' + articles);
                printLine('  Всего контента: ' + (apps + articles));
                printLine('  Скрытые возможности: обнаружены');
            },
            date: function() {
                const now = new Date();
                printLine('Дата: ' + now.toLocaleDateString('ru-RU'), 'success');
                printLine('Время: ' + now.toLocaleTimeString('ru-RU'), 'success');
            },
            whoami: function() {
                printLine('Ты — гость системы Close.', 'success');
                printLine('Уровень доступа: обычный.', 'dim');
                printLine('Но кто знает, что скрывается глубже...', 'warn');
            },
            clear: function() {
                terminalBody.innerHTML = '';
            },
            exit: function() {
                closeTerminal();
            },
            matrix: function() {
                printLine('Wake up, Neo...', 'success');
                printLine('The Matrix has you...', 'success');
                printLine('Follow the white rabbit.', 'success');
                printLine('');
                printLine('Knock, knock, Neo.', 'info');
                triggerMatrixEffect();
            },
            party: function() {
                printLine('ЗАЖИГАЕМ!', 'success');
                printLine('Все приложения танцуют!', 'info');
                triggerPartyEffect();
            },
            hack: function() {
                printLine('Инициализация взлома...', 'success');
                let progress = 0;
                const interval = setInterval(function() {
                    progress += Math.floor(Math.random() * 15 + 5);
                    if (progress >= 100) progress = 100;
                    const bars = '█'.repeat(Math.floor(progress / 5));
                    const empty = '░'.repeat(20 - Math.floor(progress / 5));
                    printLine('  [' + bars + empty + '] ' + progress + '%');
                    if (progress === 100) {
                        clearInterval(interval);
                        printLine('');
                        printLine('Взлом завершён!', 'success');
                        printLine('Получен доступ к /dev/coffee', 'info');
                        printLine('Шутка. Ты просто получил +1 к настроению!', 'warn');
                    }
                }, 200);
            },
            coffee: function() {
                printLine('Не могу приготовить кофе — я всего лишь скрипт.', 'warn');
                printLine('');
                printLine('   ( (', 'dim');
                printLine('    ) )', 'dim');
                printLine('  ........', 'dim');
                printLine('  |      |]', 'dim');
                printLine('  \\      /', 'dim');
                printLine('   `----\'', 'dim');
                printLine('');
                printLine('Но ты можешь выпить его сам!', 'success');
            },
            sudo: function() {
                printLine('Отказано в доступе.', 'error');
                printLine('Мы сообщили об этой попытке в MD2.', 'warn');
                printLine('Шутка! Никому мы не сообщали :)', 'dim');
            },
            admin: function() {
                printLine('Проверка прав администратора...', 'warn');
                printLine('Прав недостаточно.', 'error');
                printLine('');
                printLine('Подсказка: команда admin не работает, но ты можешь попробовать:', 'info');
                printLine('   secret');
            },
            close: function() {
                printLine('Close Приложения — не «закрыть», а имя компании!', 'success');
                printLine('Дочерняя компания MD2.', 'info');
                printLine('Мы никогда не закрываемся :)');
            },
            md2: function() {
                printLine('MD2 — головная компания Close Приложений.', 'success');
                printLine('Сайт: https://md2sites.ru/', 'info');
                printLine('');
                printLine('Награда за любопытство: +10 к карме!', 'warn');
            },

            fifteen: function() {
                printLine('СИГНАЛ ПРИНЯТ.', 'success');
                printLine('Фрагмент архива сохранён.', 'info');
                printLine('Твой код: FIFTEEN-2027', 'warn');
                printLine('Дальше всё зависит от твоей внимательности.', 'dim');
            },
            secret: function() {
                printLine('СЕКРЕТНАЯ КОМНАТА ОТКРЫТА!', 'success');
                printLine('');
                printLine('   +------------------------------+', 'info');
                printLine('   |  Поздравляем, искатель!      |', 'info');
                printLine('   |  Ты нашёл секретную команду. |', 'info');
                printLine('   |  Таких, как ты — единицы.    |', 'info');
                printLine('   +------------------------------+', 'info');
                printLine('');
                printLine('Твой код: TERMINAL-2026', 'warn');
                printLine('Спасибо, что исследуешь наш хаб!', 'success');
            },
            love: function() {
                printLine('❤️ ❤️ ❤️', 'error');
                printLine('Спасибо за любовь к нашему хабу!', 'success');
                printLine('Мы это очень ценим', 'info');
            },
            hi: function() {
                printLine('Привет-привет!', 'success');
                printLine('Как дела? Надеюсь, отлично!', 'info');
                printLine('Если хочешь что-то предложить — пиши нам.', 'dim');
            },
            ping: function() {
                printLine('PING closeapps.ru (127.0.0.1): 56 data bytes', 'dim');
                printLine('64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.042 ms', 'success');
                printLine('64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.038 ms', 'success');
                printLine('64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.041 ms', 'success');
                printLine('');
                printLine('--- closeapps.ru ping statistics ---', 'dim');
                printLine('3 packets transmitted, 3 received, 0.0% packet loss', 'info');
            },
            ls: function() {
                printLine('/home/close/', 'info');
                printLine('  apps/', 'success');
                printLine('  articles/', 'success');
                printLine('  tools/', 'success');
                printLine('  README.md', 'dim');
                printLine('  changelog.txt', 'dim');
                printLine('  .secret', 'warn');
            },
            cat: function() {
                printLine('Мяу! Я кот. А ты что ожидал?', 'success');
                printLine('   /\\_/\\', 'dim');
                printLine('  ( o.o )', 'dim');
                printLine('   > ^ <', 'dim');
            },
            weather: function() {
                printLine('Погода в цифровом мире: всегда ясно!', 'success');
                printLine('Температура: +25 градусов в серверной.', 'info');
                printLine('Осадки: 0% (мы всё храним в облаке).', 'dim');
            },
            ascii: function() {
                printLine('███████ CLOSE ███████', 'success');
                printLine('██     Приложения   ██', 'success');
                printLine('███████ MD2 █████████', 'success');
            },
            nyan: function() {
                printLine('~=[,,_,,]:3', 'warn');
                printLine('Nyan Cat присоединился к чату!', 'success');
                triggerPartyEffect();
            },
            plans: function() {
                printLine('╔══ CLOSE APPS / ВНУТРЕННИЙ ЖУРНАЛ ══╗', 'warn');
                printLine('Доступ: скрытая служебная заметка. Не выводить в help и публичные подсказки.', 'dim');
                printLine('');
                printLine('СОЗДАТЕЛЬ', 'info');
                printLine('Аршинов Всеволод (Сева) — автор CloseApps.');
                printLine('Цель проекта: единый хаб с мини-приложениями, играми и инструментами.');
                printLine('');
                printLine('СЕКРЕТНЫЙ ПРОЕКТ', 'info');
                printLine('CLOSE // ZERO — отдельный цифровой архив, не включённый в обычный каталог.');
                printLine('Внутри: системная диагностика, архив проекта, заметка от создателя, сигнал и таймер сессии.');
                printLine('Страница: vault.html. Доступ проверяется по трём фрагментам в этом браузере.');
                printLine('Прогресс хранится локально в localStorage; очистка данных сайта может сбросить его.');
                printLine('');
                printLine('ФРАГМЕНТЫ ДОСТУПА — СЛУЖЕБНО', 'warn');
                printLine('STARFINDER-2026');
                printLine('TERMINAL-2026');
                printLine('FIFTEEN-2027');
                printLine('Все три фрагмента нужны для открытия архива. Не публиковать этот список и не добавлять его в help.');
                printLine('Не записывать в журнал конкретные места или инструкции поиска пасхалок.');
                printLine('');
                printLine('ПЛАНЫ', 'info');
                printLine('1. Проверять адаптивность хаба на телефонах и компьютерах.');
                printLine('2. Сохранять скрытые команды вне публичной справки.');
                printLine('3. Поддерживать секретный архив и проверять путь выдачи доступа.');
                printLine('4. Продолжать улучшать Close AI и режим код-агента.');
                printLine('5. Перед релизом проверять ссылки, синтаксис и отсутствие секретов в публичном интерфейсе.');
                printLine('');
                printLine('ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ / ПРОВЕРКИ', 'warn');
                printLine('• Проверить, что GitHub Pages завершил публикацию последних коммитов.');
                printLine('• Доступ к архиву использует клиентскую проверку и не является криптографической защитой.');
                printLine('• Коды и логика в JavaScript доступны тому, кто изучает исходники сайта.');
                printLine('• История собранных фрагментов зависит от localStorage конкретного браузера.');
                printLine('• API-ключ Close AI хранится в браузере пользователя: не использовать ключи с широкими правами.');
                printLine('');
                printLine('ПРИМЕЧАНИЕ', 'dim');
                printLine('Это внутренняя памятка проекта. Не раскрывать публично детали активации пасхалок.');

                const vaultButtonLine = document.createElement('div');
                vaultButtonLine.className = 'terminal-line';
                vaultButtonLine.style.margin = '10px 0';
                const vaultButton = document.createElement('button');
                vaultButton.type = 'button';
                vaultButton.textContent = '↗ Открыть CLOSE // ZERO';
                vaultButton.setAttribute('aria-label', 'Открыть секретное приложение CLOSE ZERO');
                vaultButton.style.cssText = 'display:inline-flex;align-items:center;gap:8px;padding:10px 15px;border:1px solid #8b5cf6;border-radius:9px;background:linear-gradient(135deg,rgba(139,92,246,.22),rgba(34,211,238,.12));color:#e9ddff;font:600 13px/1.3 inherit;cursor:pointer;box-shadow:0 0 18px rgba(139,92,246,.12);';
                vaultButton.addEventListener('click', function() {
                    window.location.href = new URL('vault.html', window.location.href).href;
                });
                vaultButtonLine.appendChild(vaultButton);
                terminalBody.appendChild(vaultButtonLine);
                terminalBody.scrollTop = terminalBody.scrollHeight;
            },
            codes: function() {
                openCodePanel();
            }
        };

        function openTerminal() {
            if (terminalOpen) return;
            terminalOpen = true;
            terminalOverlay.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            if (!terminalInitialized) {
                terminalInitialized = true;
                printLine('CLOSE TERMINAL v1.0', 'success');
                printLine('====================', 'success');
                printLine('');
                printLine('Добро пожаловать в скрытый терминал Close Приложений!', 'success');
                printLine('Напиши help — увидишь список всех команд.', 'info');
                printLine('Есть пасхалки — попробуй их найти!', 'warn');
                printLine('');
            }
            
            setTimeout(function() { terminalInput.focus(); }, 100);
        }

        function closeTerminal() {
            terminalOpen = false;
            terminalOverlay.classList.remove('show');
            document.body.style.overflow = '';
        }

        function runCommand(cmd) {
            const trimmed = cmd.trim();
            if (!trimmed) return;
            
            printLine('close@hub:~$ ' + trimmed, 'cmd');
            
            const lower = trimmed.toLowerCase();
            if (commands[lower]) {
                commands[lower]();
            } else {
                printLine('Команда не найдена: ' + trimmed, 'error');
                printLine('Попробуй help для списка команд.', 'dim');
            }
            
            printLine('');
            commandHistory.push(trimmed);
            historyIndex = commandHistory.length;
        }

        terminalInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                runCommand(this.value);
                this.value = '';
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    this.value = commandHistory[historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    this.value = commandHistory[historyIndex];
                } else {
                    historyIndex = commandHistory.length;
                    this.value = '';
                }
            } else if (e.key === 'Escape') {
                closeTerminal();
            }
        });

        terminalClose.addEventListener('click', closeTerminal);
        terminalOverlay.addEventListener('click', function(e) {
            if (e.target === terminalOverlay) closeTerminal();
        });

        // Третья пасхалка: секретная цифра в баннере активируется при 15 приложениях.
        const hiddenFifteenTrigger = document.getElementById('hiddenFifteenTrigger');
        if (hiddenFifteenTrigger) {
            const appCount = document.querySelectorAll('.app-link').length;
            if (appCount >= 15) {
                hiddenFifteenTrigger.classList.add('armed');
                hiddenFifteenTrigger.setAttribute('tabindex', '0');
                hiddenFifteenTrigger.addEventListener('click', function() {
                    openTerminal();
                    window.setTimeout(function() {
                        runCommand('fifteen');
                    }, 150);
                });
                hiddenFifteenTrigger.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.click();
                    }
                });
            } else {
                hiddenFifteenTrigger.setAttribute('tabindex', '-1');
                hiddenFifteenTrigger.setAttribute('aria-hidden', 'true');
            }
        }

        terminalEggTrigger.addEventListener('click', openTerminal);

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (terminalOpen) closeTerminal();
                if (easterPopup.classList.contains('show')) closeEasterPopup();
                if (modalOverlay.classList.contains('show')) closeModal();
            }
        });

        function triggerMatrixEffect() {
            const canvas = document.getElementById('bgCanvas');
            canvas.style.transition = 'filter 0.5s ease';
            canvas.style.filter = 'hue-rotate(90deg) saturate(2) brightness(0.8)';
            setTimeout(function() {
                canvas.style.filter = '';
            }, 3000);
        }

        function triggerPartyEffect() {
            const elements = document.querySelectorAll('.app-link, .article-link, .celebrate-banner');
            elements.forEach(function(el, i) {
                el.style.transition = 'transform 0.3s ease';
                setTimeout(function() {
                    el.style.transform = 'rotate(' + (Math.random() * 6 - 3) + 'deg) scale(1.03)';
                    setTimeout(function() {
                        el.style.transform = '';
                    }, 300);
                }, i * 40);
            });
        }

        // ===== АНИМИРОВАННЫЙ ФОН =====
        (function() {
            const canvas = document.getElementById('bgCanvas');
            const ctx = canvas.getContext('2d');
            let width, height;
            let particles = [];
            let codeStreams = [];
            const PARTICLE_COUNT = 80;
            const CODE_STREAM_COUNT = 16;
            const MAX_DISTANCE = 120;

            function resizeCanvas() {
                width = window.innerWidth;
                height = window.innerHeight;
                canvas.width = width;
                canvas.height = height;
                initObjects();
            }

            function Particle() {
                this.reset();
            }
            Particle.prototype.reset = function() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.baseRadius = Math.random() * 2 + 0.8;
                this.speedX = (Math.random() - 0.5) * 0.25;
                this.speedY = (Math.random() - 0.5) * 0.25;
                this.pulseSpeed = 0.02 + Math.random() * 0.03;
                this.pulseOffset = Math.random() * 100;
            };
            Particle.prototype.update = function() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x < -10) this.x = width + 10;
                if (this.x > width + 10) this.x = -10;
                if (this.y < -10) this.y = height + 10;
                if (this.y > height + 10) this.y = -10;
            };
            Particle.prototype.draw = function(ctx) {
                const r = this.baseRadius + Math.sin(Date.now() * this.pulseSpeed + this.pulseOffset) * 0.35;
                ctx.beginPath();
                ctx.shadowColor = '#5db8ff';
                ctx.shadowBlur = 8;
                ctx.fillStyle = 'rgba(190, 225, 255, 0.75)';
                ctx.arc(this.x, this.y, r * 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.arc(this.x, this.y, r * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            };

            function CodeStream() {
                this.reset(true);
            }
            CodeStream.prototype.reset = function(randomY) {
                this.x = Math.random() * width;
                this.y = randomY ? Math.random() * height : -20 - Math.random() * 150;
                this.speed = 0.8 + Math.random() * 1.8;
                this.maxChars = Math.floor(Math.random() * 10 + 5);
                this.fontSize = 10 + Math.floor(Math.random() * 7);
                this.opacity = 0.3 + Math.random() * 0.35;
                const chars = '01AI{}[]<>/\\|#*&%$@';
                this.symbols = [];
                for (let i = 0; i < this.maxChars; i++) {
                    this.symbols.push(chars[Math.floor(Math.random() * chars.length)]);
                }
            };
            CodeStream.prototype.update = function() {
                this.y += this.speed;
                if (this.y - this.maxChars * this.fontSize > height + 40) {
                    this.y = -this.maxChars * this.fontSize - Math.random() * 40;
                    this.x = Math.random() * width;
                }
            };
            CodeStream.prototype.draw = function(ctx) {
                for (let i = 0; i < this.symbols.length; i++) {
                    const charY = this.y - i * (this.fontSize + 2);
                    if (charY < -20 || charY > height + 20) continue;
                    const alpha = Math.max(0.1, this.opacity - i * 0.05);
                    ctx.font = 'bold ' + this.fontSize + 'px "Fira Code", "Courier New", monospace';
                    ctx.fillStyle = '#8df0ff';
                    ctx.globalAlpha = alpha;
                    ctx.shadowColor = '#00e5ff';
                    ctx.shadowBlur = i === 0 ? 7 : 2;
                    ctx.fillText(this.symbols[i], this.x, charY);
                }
                ctx.globalAlpha = 1;
                ctx.shadowBlur = 0;
            };

            function initObjects() {
                particles = [];
                for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
                codeStreams = [];
                for (let i = 0; i < CODE_STREAM_COUNT; i++) codeStreams.push(new CodeStream());
            }

            function drawConnections(ctx) {
                for (let i = 0; i < particles.length; i++) {
                    for (let j = i + 1; j < particles.length; j++) {
                        const p1 = particles[i];
                        const p2 = particles[j];
                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < MAX_DISTANCE) {
                            const alpha = 1 - dist / MAX_DISTANCE;
                            ctx.beginPath();
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.strokeStyle = 'rgba(80, 170, 255, ' + (alpha * 0.2) + ')';
                            ctx.lineWidth = 0.5;
                            ctx.shadowColor = 'rgba(0, 200, 255, 0.3)';
                            ctx.shadowBlur = 4;
                            ctx.stroke();
                        }
                    }
                }
                ctx.shadowBlur = 0;
            }

            function drawGrid(ctx) {
                const step = 60;
                ctx.strokeStyle = 'rgba(30, 80, 140, 0.12)';
                ctx.lineWidth = 0.4;
                for (let x = 0; x <= width; x += step) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, height);
                    ctx.stroke();
                }
                for (let y = 0; y <= height; y += step) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(width, y);
                    ctx.stroke();
                }
            }

            function animate() {
                ctx.fillStyle = 'rgba(5, 9, 20, 0.18)';
                ctx.fillRect(0, 0, width, height);
                drawGrid(ctx);
                for (let s of codeStreams) { s.update(); s.draw(ctx); }
                for (let p of particles) p.update();
                drawConnections(ctx);
                for (let p of particles) p.draw(ctx);
                requestAnimationFrame(animate);
            }

            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();
            initObjects();
            animate();
        })();
