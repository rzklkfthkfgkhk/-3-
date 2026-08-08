// ============================================================
// APP.JS - ПОЛНАЯ ЛОГИКА САЙТА
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
    const statusMsg = document.getElementById('statusMsg');
    const sourceStatus = document.getElementById('sourceStatus');
    const reloadBtn = document.getElementById('reloadBtn');
    const nextSourceBtn = document.getElementById('nextSourceBtn');
    const debugInfo = document.getElementById('debugInfo');

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
    let loadTimeout = null;

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
            showToast('⚠️ Войдите в аккаунт, чтобы добавлять в избранное');
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

    // ===== SOURCES =====
    function getPlayerSources(id, episode) {
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
            const title = anime.title?.romaji || anime.title?.english || 'Без названия';
            const cover = anime.coverImage?.extraLarge || anime.coverImage?.large || '';
            const genres = (anime.genres || []).slice(0, 2).join(' · ');
            const score = anime.averageScore ? Math.round(anime.averageScore / 10) : '—';
            const episodes = anime.episodes || '?';
            const status = anime.status || 'UNKNOWN';
            const statusLabel = status === 'RELEASING' ? 'Выходит' : status === 'FINISHED' ? 'Завершён' : 'Ск
