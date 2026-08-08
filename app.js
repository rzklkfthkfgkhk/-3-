// ============================================================
// STAS ANIME - ПОЛНЫЙ САЙТ
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
    const watchedCount = document.getElementById('watchedCount');
    const searchTab = document.getElementById('searchTab');

    const player = document.getElementById('player');
    const playerTitle = document.getElementById('playerTitle');
    const playerFrame = document.getElementById('playerFrame');
    const closePlayer = document.getElementById('closePlayer');
    const episodeSelect = document.getElementById('episodeSelect');
    const sourceStatus = document.getElementById('sourceStatus');
    const reloadBtn = document.getElementById('reloadBtn');
    const watchBtn = document.getElementById('watchBtn');
    const playerStatus = document.getElementById('playerStatus');

    const modalOverlay = document.getElementById('modalOverlay');
    const closeModal = document.getElementById('closeModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalUsername = document.getElementById('modalUsername');
    const modalPassword = document.getElementById('modalPassword');
    const modalSubmit = document.getElementById('modalSubmit');
    const modalSwitch = document.getElementById('modalSwitch');

    const profileModal = document.getElementById('profileModal');
    const closeProfile = document.getElementById('closeProfile');
    const profileUsername = document.getElementById('profileUsername');
    const profileFavCount = document.getElementById('profileFavCount');
    const profileWatchedCount = document.getElementById('profileWatchedCount');
    const profileFavList = document.getElementById('profileFavList');
    const profileWatchedList = document.getElementById('profileWatchedList');

    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileBtn = document.getElementById('profileBtn');
    const authBtns = document.getElementById('authBtns');
    const userInfo = document.getElementById('userInfo');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const toast = document.getElementById('toast');

    // ===== STATE =====
    let currentTab = 'ongoing';
    let currentResults = [];
    let isLoading = false;
    let currentAnime = null;
    let isLoginMode = true;

    // ===== AUTH =====
    let currentUser = JSON.parse(localStorage.getItem('animeUser') || 'null');

    function updateAuthUI() {
        if (currentUser) {
            authBtns.style.display = 'none';
            userInfo.style.display = 'flex';
            userNameDisplay.textContent = '👤 ' + currentUser.username;
            updateBadges();
        } else {
            authBtns.style.display = 'flex';
            userInfo.style.display = 'none';
        }
    }

    function getFavorites() {
        if (!currentUser) return [];
        return currentUser.favorites || [];
    }

    function getWatched() {
        if (!currentUser) return [];
        return currentUser.watched || [];
    }

    function updateBadges() {
        favCount.textContent = getFavorites().length;
        watchedCount.textContent = getWatched().length;
    }

    function saveUserData() {
        if (currentUser) {
            localStorage.setItem('animeUser', JSON.stringify(currentUser));
            updateBadges();
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
            showToast('💔 Убрано');
        } else {
            favs.push(id);
            showToast('❤️ Добавлено');
        }
        currentUser.favorites = favs;
        saveUserData();
        renderCurrentView();
        updateWatchBtn();
    }

    function toggleWatched(id) {
        if (!currentUser) {
            showToast('⚠️ Войдите в аккаунт');
            return;
        }
        let watched = getWatched();
        const idx = watched.indexOf(id);
        if (idx > -1) {
            watched.splice(idx, 1);
            showToast('👁️ Убрано');
        } else {
            watched.push(id);
            showToast('👁️ Добавлено');
        }
        currentUser.watched = watched;
        saveUserData();
        renderCurrentView();
        updateWatchBtn();
    }

    function isFavorite(id) { return getFavorites().includes(id); }
    function isWatched(id) { return getWatched().includes(id); }

    function updateWatchBtn() {
        if (currentAnime && watchBtn) {
            const id = currentAnime.id;
            if (isWatched(id)) {
                watchBtn.textContent = '✅ Просмотрено';
                watchBtn.classList.add('active');
            } else {
                watchBtn.textContent = '👁️ Просмотрено';
                watchBtn.classList.remove('active');
            }
        }
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ===== MODAL =====
    function openModal(mode) {
        isLoginMode = mode === 'login';
        modalTitle.textContent = isLoginMode ? '🔐 Вход' : '📝 Регистрация';
        modalSubmit.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
        modalSwitch.textContent = isLoginMode ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти';
        modalUsername.value = '';
        modalPassword.value = '';
        modalOverlay.classList.add('show');
    }

    function closeModalFn() { modalOverlay.classList.remove('show'); }

    function handleAuth() {
        const username = modalUsername.value.trim();
        const password = modalPassword.value.trim();
        if (!username || !password) { showToast('⚠️ Заполните все поля'); return; }
        let users = JSON.parse(localStorage.getItem('animeUsers') || '[]');

        if (isLoginMode) {
            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                currentUser = { username: user.username, favorites: user.favorites || [], watched: user.watched || [] };
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
            users.push({ username, password, favorites: [], watched: [] });
            localStorage.setItem('animeUsers', JSON.stringify(users));
            currentUser = { username, favorites: [], watched: [] };
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

    // ===== PROFILE =====
    function openProfile() {
        if (!currentUser) { showToast('⚠️ Войдите в аккаунт'); return; }
        profileUsername.textContent = currentUser.username;
        const favs = getFavorites();
        const watched = getWatched();
        profileFavCount.textContent = favs.length;
        profileWatchedCount.textContent = watched.length;

        profileFavList.innerHTML = '';
        if (favs.length === 0) {
            profileFavList.innerHTML = '<div class="list-item" style="color:#555;">Нет избранных</div>';
        } else {
            favs.forEach(id => {
                const anime = currentResults.find(a => a.id === id);
                const name = anime ? (anime.title?.romaji || anime.title?.english || 'Без названия') : `ID: ${id}`;
                const div = document.createElement('div');
                div.className = 'list-item';
                div.innerHTML =
                    `<span class="title" data-id="${id}">${name}</span><span class="remove" data-id="${id}">✕</span>`;
                div.querySelector('.title').addEventListener('click', () => {
                    const a = currentResults.find(an => an.id === id);
                    if (a) openPlayer(a, name);
                    profileModal.classList.remove('show');
                });
                div.querySelector('.remove').addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleFavorite(id);
                    openProfile();
                });
                profileFavList.appendChild(div);
            });
        }

        profileWatchedList.innerHTML = '';
        if (watched.length === 0) {
            profileWatchedList.innerHTML = '<div class="list-item" style="color:#555;">Нет просмотренных</div>';
        } else {
            watched.forEach(id => {
                const anime = currentResults.find(a => a.id === id);
                const name = anime ? (anime.title?.romaji || anime.title?.english || 'Без названия') : `ID: ${id}`;
                const div = document.createElement('div');
                div.className = 'list-item';
                div.innerHTML =
                    `<span class="title" data-id="${id}">${name}</span><span class="remove" data-id="${id}">✕</span>`;
                div.querySelector('.title').addEventListener('click', () => {
                    const a = currentResults.find(an => an.id === id);
                    if (a) openPlayer(a, name);
                    profileModal.classList.remove('show');
                });
                div.querySelector('.remove').addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleWatched(id);
                    openProfile();
                });
                profileWatchedList.appendChild(div);
            });
        }
        profileModal.classList.add('show');
    }

    function closeProfileFn() { profileModal.classList.remove('show'); }

    // ===== ANILIST QUERY =====
    const ANILIST_QUERY = `
        query ($page: Int, $perPage: Int, $search: String, $sort: [MediaSort], $status: MediaStatus) {
            Page(page: $page, perPage: $perPage) {
                media(search: $search, sort: $sort, status: $status, type: ANIME) {
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
    `;

    // ===== FALLBACK =====
    const FALLBACK_ANIME = [
        { id: 21, title: { romaji: 'One Piece' }, coverImage: { large: '' }, format: 'TV', episodes: 1000, status: 'RELEASING', averageScore: 85, genres: ['Action', 'Adventure'] },
        { id: 16498, title: { romaji: 'Naruto' }, coverImage: { large: '' }, format: 'TV', episodes: 220, status: 'FINISHED', averageScore: 79, genres: ['Action', 'Adventure'] },
        { id: 11061, title: { romaji: 'Attack on Titan' }, coverImage: { large: '' }, format: 'TV', episodes: 87, status: 'FINISHED', averageScore: 87, genres: ['Action', 'Drama'] },
        { id: 5114, title: { romaji: 'Fullmetal Alchemist: Brotherhood' }, coverImage: { large: '' }, format: 'TV', episodes: 64, status: 'FINISHED', averageScore: 90, genres: ['Action', 'Adventure'] },
        { id: 30276, title: { romaji: 'One Punch Man' }, coverImage: { large: '' }, format: 'TV', episodes: 12, status: 'FINISHED', averageScore: 83, genres: ['Action', 'Comedy'] }
    ];

    function loadFallback() {
        currentResults = FALLBACK_ANIME;
        renderCards(FALLBACK_ANIME);
        count.textContent = FALLBACK_ANIME.length + ' аниме (пример)';
        currentTabLabel.textContent = '📺 Примеры';
        showToast('📺 Показаны примеры аниме');
    }
    window.loadFallback = loadFallback;

    // ===== ПОИСК ВИДЕО =====
    async function searchVideos(query, episode) {
        const searchQuery = `${query} ${episode} серия аниме`;
        try {
            // VK
            const vkUrl =
                `https://api.vk.com/method/video.search?q=${encodeURIComponent(searchQuery)}&count=5&sort=2&v=5.131`;
            const vkRes = await fetch(vkUrl);
            const vkData = await vkRes.json();
            if (vkData.response && vkData.response.items && vkData.response.items.length > 0) {
                const item = vkData.response.items[0];
                return `https://vk.com/video_ext.php?oid=${item.owner_id}&id=${item.id}&hash=${item.access_key || ''}`;
            }

            // YouTube
            const ytRes = await fetch(
                `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`);
            const ytHtml = await ytRes.text();
            const regex = /"videoId":"([^"]+)"/;
            const match = regex.exec(ytHtml);
            if (match) {
                return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
            }

            return null;
        } catch (error) {
            console.error('Ошибка поиска видео:', error);
            return null;
        }
    }

    // ===== OPEN PLAYER =====
    async function openPlayer(anime, title) {
        currentAnime = anime;
        const animeTitle = title || anime.title?.romaji || anime.title?.english || 'Аниме';

        player.classList.remove('hidden');
        playerTitle.textContent = '🎬 ' + animeTitle;

        const total = anime.episodes || 12;
        episodeSelect.innerHTML = '';
        for (let i = 1; i <= Math.min(total, 50); i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `Серия ${i}`;
            episodeSelect.appendChild(opt);
        }

        updateWatchBtn();

        const ep = parseInt(episodeSelect.value) || 1;
        sourceStatus.textContent = '🔍 Поиск видео...';
        playerStatus.textContent = '⏳ Ищем видео...';
        playerStatus.className = 'player-status';

        try {
            const videoUrl = await searchVideos(animeTitle, ep);
            if (videoUrl) {
                playerFrame.src = videoUrl;
                sourceStatus.textContent = '✅ Видео найдено!';
                playerStatus.textContent = '▶️ Воспроизведение...';
                playerStatus.className = 'player-status success';
            } else {
                sourceStatus.textContent = '❌ Видео не найдено';
                playerStatus.textContent = '❌ Видео не найдено. Попробуйте другую серию.';
                playerStatus.className = 'player-status error';
                playerFrame.src = '';
            }
        } catch (error) {
            sourceStatus.textContent = '❌ Ошибка';
            playerStatus.textContent = '⚠️ Ошибка поиска видео';
            playerStatus.className = 'player-status error';
        }

        setTimeout(() => {
            player.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    async function changeEpisode() {
        if (currentAnime) {
            const title = currentAnime.title?.romaji || currentAnime.title?.english || 'Аниме';
            await openPlayer(currentAnime, title);
        }
    }

    async function reloadPlayer() {
        if (currentAnime) {
            const title = currentAnime.title?.romaji || currentAnime.title?.english || 'Аниме';
            await openPlayer(currentAnime, title);
        }
    }

    function closePlayerFn() {
        player.classList.add('hidden');
        playerFrame.src = '';
        currentAnime = null;
        playerStatus.textContent = '💡 Выберите аниме';
        playerStatus.className = 'player-status';
    }

    // ===== RENDER CARDS =====
    function renderCards(list) {
        if (!list || list.length === 0) {
            grid.innerHTML = `
                <div class="empty">
                    <i class="fas fa-inbox"></i>
                    <h3>Ничего не найдено</h3>
                    <button onclick="loadFallback()" style="margin-top:12px;padding:8px 20px;border-radius:20px;border:none;background:#7c3aed;color:#fff;cursor:pointer;">📺 Показать примеры</button>
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
            const watched = isWatched(anime.id);

            html += `
                <div class="card" data-id="${anime.id}" data-title="${encodeURIComponent(title)}">
                    <div class="card-actions">
                        <button class="fav-btn ${fav ? 'active' : ''}" data-id="${anime.id}">${fav ? '❤️' : '🤍'}</button>
                        <button class="watched-btn ${watched ? 'active' : ''}" data-id="${anime.id}">${watched ? '👁️' : '👁️'}</button>
                    </div>
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
                if (e.target.closest('.card-actions')) return;
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
                this.classList.toggle('active');
                this.textContent = this.classList.contains('active') ? '❤️' : '🤍';
            });
        });

        document.querySelectorAll('.watched-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = parseInt(this.dataset.id);
                toggleWatched(id);
                this.classList.toggle('active');
            });
        });
    }

    // ===== LOAD ANIME =====
    async function loadAnime(tab, search = '') {
        if (isLoading) return;
        isLoading = true;
        grid.innerHTML = `<div class="loading"><div class="spinner"></div><p>Загрузка...</p></div>`;

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
                    count.textContent = '0 избранных';
                    currentTabLabel.textContent = '❤️ Избранное';
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
                count.textContent = media.length + ' избранных';
                currentTabLabel.textContent = '❤️ Избранное';
                isLoading = false;
                return;
            } else if (tab === 'watched') {
                const watchedList = getWatched();
                if (watchedList.length === 0) {
                    grid.innerHTML =
                        `<div class="empty"><i class="fas fa-eye"></i><h3>Нет просмотренных</h3><p>Добавьте аниме в просмотренные 👁️</p></div>`;
                    count.textContent = '0 просмотренных';
                    currentTabLabel.textContent = '👁️ Просмотренные';
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
                        variables: { ids: watchedList }
                    })
                });
                const json = await res.json();
                const media = json?.data?.Page?.media || [];
                currentResults = media;
                renderCards(media);
                count.textContent = media.length + ' просмотренных';
                currentTabLabel.textContent = '👁️ Просмотренные';
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

            const res = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: ANILIST_QUERY, variables })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();
            if (json.errors) {
                throw new Error(json.errors[0]?.message || 'Ошибка GraphQL');
            }

            const media = json?.data?.Page?.media || [];
            currentResults = media;

            if (media.length === 0) {
                grid.innerHTML = `
                    <div class="empty">
                        <i class="fas fa-inbox"></i>
                        <h3>Ничего не найдено</h3>
                        <button onclick="loadFallback()" style="margin-top:12px;padding:8px 20px;border-radius:20px;border:none;background:#7c3aed;color:#fff;cursor:pointer;">📺 Показать примеры</button>
                    </div>
                `;
                count.textContent = '0';
                currentTabLabel.textContent = label || '📺 Онгоинги';
                isLoading = false;
                return;
            }

            renderCards(media);
            count.textContent = media.length + ' аниме';
            currentTabLabel.textContent = label || '📺 Онгоинги';

        } catch (err) {
            console.error('Ошибка:', err);
            grid.innerHTML = `
                <div class="empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ошибка загрузки</h3>
                    <p>${err.message}</p>
                    <button onclick="loadFallback()" style="margin-top:12px;padding:8px 20px;border-radius:20px;border:none;background:#7c3aed;color:#fff;cursor:pointer;">📺 Показать примеры</button>
                </div>
            `;
            count.textContent = '⚠️ Ошибка';
        } finally {
            isLoading = false;
        }
    }

    function renderCurrentView() {
        const tab = currentTab;
        if (tab === 'search') {
            const q = searchInput.value.trim();
            if (q) { loadAnime('search', q); } else {
                grid.innerHTML = `
                    <div class="empty">
                        <i class="fas fa-search"></i>
                        <h3>Введите запрос</h3>
                        <p>Найдите любимое аниме</p>
                    </div>
                `;
                count.textContent = '0';
                currentTabLabel.textContent = '🔍 Поиск';
            }
            return;
        }
        loadAnime(tab);
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
        if (tab === 'search') { searchInput.focus(); return; }
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
    reloadBtn.addEventListener('click', reloadPlayer);
    watchBtn.addEventListener('click', function() {
        if (currentAnime) {
            toggleWatched(currentAnime.id);
            updateWatchBtn();
        }
    });

    // ===== AUTH EVENTS =====
    loginBtn.addEventListener('click', () => openModal('login'));
    registerBtn.addEventListener('click', () => openModal('register'));
    logoutBtn.addEventListener('click', logout);
    profileBtn.addEventListener('click', openProfile);
    closeModal.addEventListener('click', closeModalFn);
    closeProfile.addEventListener('click', closeProfileFn);
    modalSubmit.addEventListener('click', handleAuth);
    modalSwitch.addEventListener('click', () => { openModal(isLoginMode ? 'register' : 'login'); });
    modalOverlay.addEventListener('click', function(e) { if (e.target === this) closeModalFn(); });
    profileModal.addEventListener('click', function(e) { if (e.target === this) closeProfileFn(); });
    modalUsername.addEventListener('keypress', function(e) { if (e.key === 'Enter') modalPassword.focus(); });
    modalPassword.addEventListener('keypress', function(e) { if (e.key === 'Enter') handleAuth(); });

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
            if (profileModal.classList.contains('show')) closeProfileFn();
        }
    });

    // ===== INIT =====
    updateAuthUI();
    updateBadges();
    setTimeout(() => { loadAnime('ongoing'); }, 300);
    setTimeout(() => {
        if (currentResults.length === 0) loadFallback();
    }, 4000);

})();
