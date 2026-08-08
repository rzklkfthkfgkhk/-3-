// ============================================================
// APP.JS - STAS ANIME (АВТОМАТИЧЕСКИЙ ПОИСК ВИДЕО)
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
    const nextSourceBtn = document.getElementById('nextSourceBtn');
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

    function isFavorite(id) {
        return getFavorites().includes(id);
    }

    function isWatched(id) {
        return getWatched().includes(id);
    }

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
        if (!currentUser) {
            showToast('⚠️ Войдите в аккаунт');
            return;
        }
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

    function closeProfileFn() {
        profileModal.classList.remove('show');
    }

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

    // ===== ПОИСК ВИДЕО В VK =====
    async function searchVKVideo(query, episode) {
        try {
            const searchQuery = `${query} ${episode} серия аниме`;
            const response = await fetch(
                `https://api.vk.com/method/video.search?q=${encodeURIComponent(searchQuery)}&count=10&sort=1&v=5.131`
            );
            const data = await response.json();

            if (data.response && data.response.items) {
                return data.response.items.map(item => ({
                    id: item.id,
                    title: item.title,
                    description: item.description || '',
                    source: 'VK',
                    thumbnail: item.image?.[0]?.url || '',
                    url: `https://vk.com/video_ext.php?oid=${item.owner_id}&id=${item.id}&hash=${item.access_key || ''}`,
                    duration: item.duration || 0,
                    views: item.views || 0
                }));
            }
            return [];
        } catch (error) {
            console.error('VK search error:', error);
            return [];
        }
    }

    // ===== ПОИСК ВИДЕО В YOUTUBE =====
    async function searchYouTubeVideo(query, episode) {
        try {
            const searchQuery = `${query} ${episode} серия аниме`;
            // Используем публичный метод
            const response = await fetch(
                `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`
            );
            const html = await response.text();

            // Парсим ID видео
            const videoIds = [];
            const regex = /"videoId":"([^"]+)"/g;
            let match;
            let count = 0;
            while ((match = regex.exec(html)) !== null && count < 10) {
                if (!videoIds.includes(match[1])) {
                    videoIds.push(match[1]);
                    count++;
                }
            }

            return videoIds.map(id => ({
                id: id,
                title: query,
                source: 'YouTube',
                thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
                url: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
                duration: 0,
                views: 0
            }));
        } catch (error) {
            console.error('YouTube search error:', error);
            return [];
        }
    }

    // ===== ПОИСК ВИДЕО В ВКОНТАКТЕ (ПРЯМОЙ API) =====
    async function searchVKDirect(query, episode) {
        try {
            // Используем другой метод VK API
            const searchQuery = `${query} ${episode} серия`;
            const response = await fetch(
                `https://api.vk.com/method/video.search?q=${encodeURIComponent(searchQuery)}&count=15&sort=2&hd=1&v=5.131`
            );
            const data = await response.json();

            if (data.response && data.response.items) {
                return data.response.items.map(item => ({
                    id: item.id,
                    title: item.title,
                    source: 'VK (HD)',
                    thumbnail: item.image?.[0]?.url || '',
                    url: `https://vk.com/video_ext.php?oid=${item.owner_id}&id=${item.id}&hash=${item.access_key || ''}`,
                    duration: item.duration || 0,
                    views: item.views || 0
                }));
            }
            return [];
        } catch (error) {
            console.error('VK Direct search error:', error);
            return [];
        }
    }

    // ===== ВСЕ ИСТОЧНИКИ =====
    async function findAllVideos(query, episode) {
        const sources = [
            { name: 'VK', fn: searchVKVideo },
            { name: 'VK Direct', fn: searchVKDirect },
            { name: 'YouTube', fn: searchYouTubeVideo }
        ];

        let allResults = [];

        for (const source of sources) {
            try {
                const results = await source.fn(query, episode);
                if (results && results.length > 0) {
                    allResults = allResults.concat(results);
                }
            } catch (e) {
                console.error(`Ошибка ${source.name}:`, e);
            }
        }

        // Убираем дубликаты по URL
        const unique = [];
        const urls = new Set();
        for (const item of allResults) {
            if (!urls.has(item.url)) {
                urls.add(item.url);
                unique.push(item);
            }
        }

        return unique;
    }

    // ===== ОТКРЫТЬ ПЛЕЕР С ВИДЕО =====
    async function openPlayerWithVideo(anime, title, episode) {
        currentAnime = anime;
        const animeTitle = title || anime.title?.romaji || anime.title?.english || 'Аниме';

        player.classList.remove('hidden');
        playerTitle.textContent = '🎬 ' + animeTitle;

        // Настраиваем серии
        const total = anime.episodes || 12;
        episodeSelect.innerHTML = '';
        for (let i = 1; i <= Math.min(total, 50); i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `Серия ${i}`;
            if (i === episode) opt.selected = true;
            episodeSelect.appendChild(opt);
        }

        updateWatchBtn();

        // Ищем видео
        const ep = episode || parseInt(episodeSelect.value) || 1;
        sourceStatus.textContent = '🔍 Поиск видео...';
        playerStatus.textContent = '⏳ Ищем видео в VK, YouTube...';

        try {
            const videos = await findAllVideos(animeTitle, ep);

            if (videos.length === 0) {
                sourceStatus.textContent = '❌ Видео не найдены';
                playerStatus.textContent = '❌ Не найдено видео для этой серии. Попробуйте другую серию.';
                playerFrame.src = '';
                return;
            }

            // Показываем первое видео
            const video = videos[0];
            playerFrame.src = video.url;
            sourceStatus.textContent = `▶️ ${video.source} (${videos.length} найдено)`;
            playerStatus.textContent = `✅ Воспроизведение: ${video.title}`;

            // Прокрутка к плееру
            setTimeout(() => {
                player.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);

        } catch (error) {
            console.error('Ошибка загрузки видео:', error);
            sourceStatus.textContent = '❌ Ошибка';
            playerStatus.textContent = '⚠️ Ошибка при поиске видео';
        }
    }

    // ===== ОБНОВЛЕННАЯ ФУНКЦИЯ OPENPLAYER =====
    async function openPlayer(anime, title) {
        const ep = parseInt(episodeSelect.value) || 1;
        await openPlayerWithVideo(anime, title, ep);
    }

    // ===== СМЕНА СЕРИИ =====
    async function changeEpisode() {
        if (currentAnime) {
            const title = currentAnime.title?.romaji || currentAnime.title?.english || 'Аниме';
            const ep = parseInt(episodeSelect.value) || 1;
            await openPlayerWithVideo(currentAnime, title, ep);
        }
    }

    // ===== ОБНОВИТЬ ПЛЕЕР =====
    async function reloadPlayer() {
        if (currentAnime) {
            const title = currentAnime.title?.romaji || currentAnime.title?.english || 'Аниме';
            const ep = parseInt(episodeSelect.value) || 1;
            await openPlayerWithVideo(currentAnime, title, ep);
        }
    }

    // ===== ЗАКРЫТЬ ПЛЕЕР =====
    function closePlayerFn() {
        player.classList.add('hidden');
        playerFrame.src = '';
        currentAnime = null;
        playerStatus.textContent = '💡 Выберите аниме';
    }

    // ===== RENDER CARDS =====
    function renderCards(list) {
        if (!list || list.length === 0) {
            grid.innerHTML = `
                <div class="empty">
                    <i class="fas fa-inbox"></i>
                    <h3>Ничего не найдено</h3>
                    <p>Попробуйте другую вкладку</p>
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
                        <button class="fav-btn ${fav ? 'active' : ''}" data-id="${anime.id}" title="В избранное">${fav ? '❤️' : '🤍'}</button>
                        <button class="watched-btn ${watched ? 'active' : ''}" data-id="${anime.id}" title="Просмотрено">${watched ? '👁️' : '👁️'}</button>
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
                if (anime) {
                    const ep = parseInt(episodeSelect.value) || 1;
                    openPlayerWithVideo(anime, title, ep);
                }
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

    // ===== RENDER CURRENT VIEW =====
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
                count.textContent = '0';
                currentTabLabel.textContent = '🔍 Поиск';
            }
            return;
        }
        loadAnime(tab);
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
    reloadBtn.addEventListener('click', reloadPlayer);
    nextSourceBtn.addEventListener('click', reloadPlayer);
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
    modalSwitch.addEventListener('click', () => {
        openModal(isLoginMode ? 'register' : 'login');
    });
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === this) closeModalFn();
    });
    profileModal.addEventListener('click', function(e) {
        if (e.target === this) closeProfileFn();
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
            if (profileModal.classList.contains('show')) closeProfileFn();
        }
    });

    // ===== INIT =====
    updateAuthUI();
    updateBadges();

    // Автозагрузка One Piece
    setTimeout(() => {
        loadAnime('ongoing');
    }, 300);

    // Если через 4 секунды ничего нет - показываем fallback
    setTimeout(() => {
        if (currentResults.length === 0) {
            loadFallback();
        }
    }, 4000);

})();
