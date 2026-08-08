// ============================================================
// APP.JS - STAS ANIME (ПОЛНАЯ ВЕРСИЯ)
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
    const video = document.getElementById('videoPlayer');
    const videoSource = document.getElementById('videoSource');
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
    let currentSourceIndex = 0;
    let currentSources = [];
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

    // ===== FALLBACK DATA =====
    const FALLBACK_ANIME = [
        { id: 21, title: { romaji: 'One Piece' }, coverImage: { large: '' }, format: 'TV', episodes: 1000, status: 'RELEASING', averageScore: 85, genres: ['Action', 'Adventure'] },
        { id: 16498, title: { romaji: 'Naruto' }, coverImage: { large: '' }, format: 'TV', episodes: 220, status: 'FINISHED', averageScore: 79, genres: ['Action', 'Adventure'] },
        { id: 11061, title: { romaji: 'Attack on Titan' }, coverImage: { large: '' }, format: 'TV', episodes: 87, status: 'FINISHED', averageScore: 87, genres: ['Action', 'Drama'] },
        { id: 5114, title: { romaji: 'Fullmetal Alchemist: Brotherhood' }, coverImage: { large: '' }, format: 'TV', episodes: 64, status: 'FINISHED', averageScore: 90, genres: ['Action', 'Adventure'] },
        { id: 9253, title: { romaji: 'Steins;Gate' }, coverImage: { large: '' }, format: 'TV', episodes: 24, status: 'FINISHED', averageScore: 88, genres: ['Sci-Fi', 'Thriller'] },
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

    // ===== PLAYER SOURCES =====
    function getPlayerSources(id, episode) {
        return [
            `https://animeflix.live/embed/${id}?
