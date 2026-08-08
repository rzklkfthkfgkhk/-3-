// ============================================================
// APP.JS - ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================================

(function() {
    'use strict';

    // ===== DOM =====
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const grid = document.getElementById('grid');
    const count = document.getElementById('count');
    const currentTabLabel = document.getElementById('currentTabLabel');
    const logo = document.getElementById('logoLink');
    const nav = document.getElementById('nav');
    const favCount = document.getElementById('favCount');
    const searchTab = document.getElementById('searchTab');

    const player = document.getElementById('player');
    const playerTitle = document.getElementById('playerTitle');
    const playerFrame = document.getElementById('playerFrame');
    const closePlayer = document.getElementById('closePlayer');
    const episodeSelect = document.getElementById('episodeSelect');
    const qualitySelect = document.getElementById('qualitySelect');
    const statusMsg = document.getElementById('statusMsg');
    const sourceStatus = document.getElementById('sourceStatus');
    const reloadBtn = document.getElementById('reloadBtn');
    const nextSourceBtn = document.getElementById('nextSourceBtn');

    const modalOverlay = document.getElementById('modalOverlay');
    const closeModal = document.getElementById('closeModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalUsername = document.getElementById('modalUsername');
    const modalPassword = document.getElementById('modalPassword');
    const modalSubmit = document.getElementById('modalSubmit');
    const modalSwitch = document.getElementById('modalSwitch');

    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authBtns = document.getElementById('authBtns');
    const userInfo = document.getElementById('userInfo');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const toast = document.getElementById('toast');

    // ===== STATE =====
    let currentTab = 'ongoing';
    let currentResults = [];
    let isLoading = false;
    let currentAnime = null;
    let currentSourceIndex = 0;
    let currentSources = [];
    let isLoginMode = true;

    // ===== AUTH =====
    let currentUser = JSON.parse(localStorage.getItem('animeUser') || 'null');

    function updateAuthUI() {
        if (currentUser) {
            authBtns.style.display = 'none';
            userInfo.style.display = 'flex';
            userNameDisplay.innerHTML = `<i class="fas fa-user"></i> ${currentUser.username}`;
        } else {
            authBtns.style.display = 'flex';
            userInfo.style.display = 'none';
        }
    }

    function getFavorites() {
        if (!currentUser) return [];
        return currentUser.favorites || [];
    }

    function saveFavorites(favorites) {
        if (currentUser) {
            currentUser.favorites = favorites;
            localStorage.setItem('animeUser', JSON.stringify(currentUser));
            favCount.textContent = favorites.length;
        }
    }

    function toggleFavorite(id) {
        if (!currentUser) {
            showToast('⚠️ Войдите в аккаунт');
            return;
        }
        let favs = getFavorites();
        const idx = favs.indexOf(id);
        if (idx > -1) {
            favs.splice(idx, 1);
        } else {
            favs.push(id);
        }
        saveFavorites(favs);
        renderCurrentView();
    }

    function isFavorite(id) {
        return getFavorites().includes(id);
    }

    // ===== TOAST =====
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => toast.classList.remove('show'), 3500);
    }

    // ===== MODAL =====
    function openModal(mode) {
        isLoginMode = mode === 'login';
        modalTitle.innerHTML = isLoginMode ?
            '<i class="fas fa-sign-in-alt"></i> Вход' :
            '<i class="fas fa-user-plus"></i> Регистрация';
        modalSubmit.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
        modalSwitch.textContent = isLoginMode ?
            'Нет аккаунта? Зарегистрироваться' :
            'Уже есть аккаунт? Войти';
        modalUsername.value = '';
        modalPassword.value = '';
        modalOverlay.classList.add('show');
    }

    function closeModalFn() {
        modalOverlay.classList.remove('show');
    }

    function handleAuth() {
        const username = modalUsername.value.trim();
        const password = modalPassword.value.trim();

        if (!username || !password) {
            showToast('⚠️ Заполните все поля');
            return;
        }

        let users = JSON.parse(localStorage.getItem('animeUsers') || '[]');

        if (isLoginMode) {
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                currentUser = { username: user.username, favorites: user.favorites || [] };
                localStorage.setItem('animeUser', JSON.stringify(currentUser));
                updateAuthUI();
                closeModalFn();
                showToast(`✅ Добро пожаловать, ${username}!`);
                renderCurrentView();
                return;
            }
            showToast('❌ Неверное имя или пароль');
        } else {
            if (users.find(u => u.username === username)) {
                showToast('❌ Пользователь уже существует');
                return;
            }
            users.push({ username, password, favorites: [] });
            localStorage.setItem('animeUsers', JSON.stringify(users));
            currentUser = { username, favorites: [] };
            localStorage.setItem('animeUser', JSON.stringify(currentUser));
            updateAuthUI();
            closeModalFn();
            showToast(`✅ Аккаунт создан! Добро пожаловать, ${username}!`);
            renderCurrentView();
        }
    }

    function logout() {
        currentUser = null;
        localStorage.removeItem('animeUser');
        updateAuthUI();
        showToast('👋 Вы вышли');
        renderCurrentView();
    }

    // ===== ANILIST QUERY (ИСПРАВЛЕННЫЙ) =====
    const ANILIST_QUERY = `
        query ($page: Int, $perPage: Int, $search: String, $sort: [MediaSort], $status: MediaStatus) {
            Page(page: $page, perPage: $perPage) {
                media(search: $search, sort: $sort, status: $status, type: ANIME) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    coverImage {
                        large
                        extraLarge
                    }
                    format
                    episodes
                    status
                    averageScore
                    genres
                    seasonYear
                }
            }
        }
    `;

    // ===== ИСТОЧНИКИ ДЛЯ ОНЛАЙН ПРОСМОТРА =====
    function getPlayerSources(id, episode, quality) {
        const q = quality || '720';
        return [
            `https://animeflix.live/embed/${id}?ep=${episode}`,
            `https://gogoanime.llc/embed/${id}?ep=${episode}`,
            `https://aniwatch.to/embed/${id}?ep=${episode}`,
            `https://zoro.to/embed/${id}?ep=${episode}`,
            `https://allanime.to/embed/${id}?ep=${episode}`,
            `https://animepahe.com/embed/${id}?ep=${episode}`,
            `https://9anime.to/embed/${id}?ep=${episode}`
        ];
    }

    // ===== RENDER =====
    function renderCards(list) {
        if (!list || list.length === 0) {
            grid.innerHTML = `
                <div class="empty">
                    <i class="fas fa-inbox"></i>
                    <h3>Ничего не найдено</h3>
                    <p>Попробуйте изменить поисковый запрос</p>
                </div>
            `;
            return;
        }

        let html = '';
        for (const anime of list) {
            const title = anime.title?.romaji || anime.title?.english || anime.title?.native || 'Без названия';
            const cover = anime.coverImage?.extraLarge || anime.coverImage?.large || '';
            const genres = (anime.genres || []).slice(0, 2).join(' · ');
            const score = anime.averageScore ? Math.round(anime.averageScore / 10) : '—';
            const episodes = anime.episodes || '?';
            const status = anime.status || 'UNKNOWN';
            const statusLabel = status === 'RELEASING' ? '🟢 Выходит' : status === 'FINISHED' ? '🔵 Завершён' : '⚪ Скоро';
            const dotClass = status === 'RELEASING' ? 'green' : status === 'FINISHED' ? 'blue' : 'gray';
            const fav = isFavorite(anime.id);

            html += `
                <div class="card" data-id="${anime.id}" data-title="${encodeURIComponent(title)}">
                    <button class="fav-btn ${fav ? 'active' : ''}" data-id="${anime.id}">${fav ? '❤️' : '🤍'}</button>
                    <img src="${cover}" alt="${title}" loading="lazy"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22%3E%3Crect fill=%22%2314142a%22 width=%22300%22 height=%22450%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 fill=%22%23555%22 text-anchor=%22middle%22 dominant-baseline=%22central%22%3ENo Image%3C/text%3E%3C/svg%3E'" />
                    <div class="card-body">
                        <h3>${escapeHtml(title)}</h3>
                        ${genres ? `<div class="genres">${escapeHtml(genres)}</div>` : ''}
                        <div class="meta">
                            <span>${anime.format || 'TV'}</span>
                            <span class="score">⭐ ${score}</span>
                            <span>${episodes} эп.</span>
                            ${anime.seasonYear ? `<span>${anime.seasonYear}</span>` : ''}
                        </div>
                        <div class="status-line">
                            <span class="status-dot ${dotClass}"></span>
                            ${statusLabel}
                        </div>
                    </div>
                </div>
            `;
        }
        grid.innerHTML = html;

        document.querySelectorAll('.card').forEach(el => {
            el.addEventListener('click', function(e) {
                if (e.target.closest('.fav-btn')) return;
                const id = parseInt(this.dataset.id);
                const title = decodeURIComponent(this.dataset.title);
                const anime = currentResults.find(a => a.id === id);
                if (anime) openPlayer(anime, title);
            });
        });

        document.querySelectorAll('.fav-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = parseInt(this.dataset.id);
                toggleFavorite(id);
                const isFav = isFavorite(id);
                this.textContent = isFav ? '❤️' : '🤍';
                this.classList.toggle('active', isFav);
            });
        });
    }

    // ===== LOAD ANIME (ИСПРАВЛЕННЫЙ) =====
    async function loadAnime(tab, search = '') {
        if (isLoading) return;
        isLoading = true;
        showLoading();

        try {
            let variables = { page: 1, perPage: 30 };
            let label = '';

            if (tab === 'ongoing') {
                variables.status = 'RELEASING';
                variables.sort = ['POPULARITY_DESC'];
                label = '📺 Онгоинги';
            } else if (tab === 'top') {
                variables.sort = ['SCORE_DESC'];
                label = '🏆 Топ-100';
            } else if (tab === 'favorites') {
                const favs = getFavorites();
                if (favs.length === 0) {
                    grid.innerHTML =
                        `<div class="empty"><i class="fas fa-heart"></i><h3>Нет избранных</h3><p>Добавьте аниме в избранное ❤️</p></div>`;
                    count.innerHTML = '<i class="fas fa-list"></i> 0 избранных';
                    currentTabLabel.innerHTML = '<i class="fas fa-heart"></i> Избранное';
                    isLoading = false;
                    return;
                }
                const res = await fetch('https://graphql.anilist.co', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: `
                                query ($ids: [Int]) {
                                    Page(page: 1, perPage: 50) {
                                        media(id_in: $ids, type: ANIME, sort: [POPULARITY_DESC]) {
                                            id
                                            title { romaji english native }
                                            coverImage { large extraLarge }
                                            format
                                            episodes
                                            status
                                            averageScore
                                            genres
                                            seasonYear
                                        }
                                    }
                                }
                            `,
                        variables: { ids: favs }
                    })
                });
                const json = await res.json();
                const media = json?.data?.Page?.media || [];
                currentResults = media;
                renderCards(media);
                count.innerHTML = `<i class="fas fa-list"></i> ${media.length} избранных`;
                currentTabLabel.innerHTML = '<i class="fas fa-heart"></i> Избранное';
                isLoading = false;
                return;
            } else if (tab === 'search' && search) {
                variables.search = search;
                variables.sort = ['POPULARITY_DESC'];
                label = `🔍 Результаты: "${search}"`;
            } else {
                isLoading = false;
                return;
            }

            console.log('Запрос к AniList:', variables);

            const res = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: ANILIST_QUERY,
                    variables: variables
                })
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const json = await res.json();
            
            if (json.errors) {
                console.error('GraphQL Errors:', json.errors);
                throw new Error(json.errors[0]?.message || 'Ошибка GraphQL');
            }

            const media = json?.data?.Page?.media || [];
            console.log(`Получено ${media.length} аниме`);
            currentResults = media;
            renderCards(media);
            count.innerHTML = `<i class="fas fa-list"></i> ${media.length} аниме`;
            currentTabLabel.innerHTML = label || '<i class="fas fa-play-circle"></i> Онгоинги';

        } catch (err) {
            console.error('Ошибка загрузки:', err);
            grid.innerHTML = `
                <div class="empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ошибка загрузки</h3>
                    <p>${err.message}</p>
                    <button onclick="location.reload()" style="margin-top:12px;padding:8px 24px;border-radius:20px;border:none;background:#7c3aed;color:#fff;cursor:pointer;">🔄 Обновить</button>
                </div>
            `;
            count.innerHTML = '<i class="fas fa-list"></i> ⚠️ Ошибка';
        } finally {
            isLoading = false;
        }
    }

    function renderCurrentView() {
        const tab = currentTab;
        if (tab === 'search') {
            const q = searchInput.value.trim();
            if (q) {
                loadAnime('search', q);
            } else {
                grid.innerHTML = `
                    <div class="empty">
                        <i class="fas fa-search"></i>
                        <h3>Введите запрос</h3>
                        <p>Найдите любимое аниме</p>
                    </div>
                `;
                count.innerHTML = '<i class="fas fa-list"></i> 0';
                currentTabLabel.innerHTML = '<i class="fas fa-search"></i> Поиск';
            }
            return;
        }
        loadAnime(tab);
    }

    // ===== PLAYER =====
    function openPlayer(anime, title) {
        currentAnime = anime;
        const animeTitle = title || anime.title?.romaji || anime.title?.english || 'Аниме';

        player.classList.remove('hidden');
        playerTitle.innerHTML = `<i class="fas fa-play-circle" style="color:#7c3aed;"></i> ${animeTitle}`;

        const total = anime.episodes || 12;
        episodeSelect.innerHTML = '';
        for (let i = 1; i <= Math.min(total, 50); i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `Серия ${i}`;
            episodeSelect.appendChild(opt);
        }

        currentSourceIndex = 0;
        const ep = parseInt(episodeSelect.value) || 1;
        const quality = qualitySelect.value || '720';
        currentSources = getPlayerSources(anime.id, ep, quality);
        loadSource(0);

        setTimeout(() => {
            player.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    function loadSource(index) {
        if (index >= currentSources.length) {
            setStatus('❌ Все источники попробованы', 'error');
            sourceStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> Нет доступных источников';
            return;
        }

        currentSourceIndex = index;
        const url = currentSources[index];

        sourceStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Источник ${index + 1}/${currentSources.length}`;
        setStatus(`⏳ Загрузка...`, 'info');

        playerFrame.src = url;

        let timeoutId = setTimeout(() => {
            loadSource(index + 1);
        }, 10000);

        playerFrame.onload = function() {
            clearTimeout(timeoutId);
            setStatus('✅ Видео загружено!', 'success');
            sourceStatus.innerHTML = `<i class="fas fa-check-circle" style="color:#4ade80;"></i> Источник ${index + 1}`;
        };

        playerFrame.onerror = function() {
            clearTimeout(timeoutId);
            loadSource(index + 1);
        };
    }

    function nextSource() {
        if (currentAnime) {
            const ep = parseInt(episodeSelect.value) || 1;
            const quality = qualitySelect.value || '720';
            currentSources = getPlayerSources(currentAnime.id, ep, quality);
            loadSource(currentSourceIndex + 1);
        }
    }

    function changeEpisode() {
        if (currentAnime) {
            const ep = parseInt(episodeSelect.value) || 1;
            const quality = qualitySelect.value || '720';
            currentSourceIndex = 0;
            currentSources = getPlayerSources(currentAnime.id, ep, quality);
            loadSource(0);
        }
    }

    function changeQuality() {
        if (currentAnime) {
            const ep = parseInt(episodeSelect.value) || 1;
            const quality = qualitySelect.value || '720';
            currentSourceIndex = 0;
            currentSources = getPlayerSources(currentAnime.id, ep, quality);
            loadSource(0);
        }
    }

    function reloadPlayer() {
        if (currentAnime) {
            const ep = parseInt(episodeSelect.value) || 1;
            const quality = qualitySelect.value || '720';
            currentSourceIndex = 0;
            currentSources = getPlayerSources(currentAnime.id, ep, quality);
            loadSource(0);
        }
    }

    function setStatus(msg, type) {
        statusMsg.innerHTML = msg;
        statusMsg.className = 'msg ' + (type || 'info');
    }

    function closePlayerFn() {
        player.classList.add('hidden');
        playerFrame.src = '';
        currentAnime = null;
    }

    // ===== UI HELPERS =====
    function showLoading() {
        grid.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Загрузка аниме...</p>
            </div>
        `;
    }

    function escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    // ===== NAVIGATION =====
    nav.addEventListener('click', function(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        const tab = btn.dataset.tab;
        if (!tab) return;
        if (tab === 'search') {
            searchInput.focus();
            return;
        }
        document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = tab;
        renderCurrentView();
    });

    searchTab.addEventListener('click', function() {
        searchInput.focus();
        const q = searchInput.value.trim();
        if (q) {
            currentTab = 'search';
            document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadAnime('search', q);
        }
    });

    searchBtn.addEventListener('click', function() {
        const q = searchInput.value.trim();
        if (q) {
            currentTab = 'search';
            document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
            searchTab.classList.add('active');
            loadAnime('search', q);
        }
    });

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchBtn.click();
    });

    // ===== PLAYER EVENTS =====
    closePlayer.addEventListener('click', closePlayerFn);
    episodeSelect.addEventListener('change', changeEpisode);
    qualitySelect.addEventListener('change', changeQuality);
    reloadBtn.addEventListener('click', reloadPlayer);
    nextSourceBtn.addEventListener('click', nextSource);

    // ===== AUTH EVENTS =====
    loginBtn.addEventListener('click', () => openModal('login'));
    registerBtn.addEventListener('click', () => openModal('register'));
    logoutBtn.addEventListener('click', logout);
    closeModal.addEventListener('click', closeModalFn);
    modalSubmit.addEventListener('click', handleAuth);
    modalSwitch.addEventListener('click', () => {
        openModal(isLoginMode ? 'register' : 'login');
    });
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === this) closeModalFn();
    });
    modalUsername.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') modalPassword.focus();
    });
    modalPassword.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleAuth();
    });

    // ===== LOGO =====
    logo.addEventListener('click', function() {
        closePlayerFn();
        currentTab = 'ongoing';
        document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-tab="ongoing"]')?.classList.add('active');
        loadAnime('ongoing');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ===== ESC =====
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (!player.classList.contains('hidden')) closePlayerFn();
            if (modalOverlay.classList.contains('show')) closeModalFn();
        }
    });

    // ===== INIT =====
    updateAuthUI();
    favCount.textContent = getFavorites().length;

    // Загружаем онгоинги при старте
    loadAnime('ongoing');

    // Дублируем запрос через 2 секунды если ничего не загрузилось
    setTimeout(() => {
        if (currentResults.length === 0) {
            console.log('Повторная попытка загрузки...');
            loadAnime('ongoing');
        }
    }, 3000);

})();
