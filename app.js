// ============================================================
// APP.JS - STAS ANIME
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
    const qualitySelect = document.getElementById('qualitySelect');
    const statusMsg = document.getElementById('statusMsg');
    const sourceStatus = document.getElementById('sourceStatus');
    const reloadBtn = document.getElementById('reloadBtn');
    const nextSourceBtn = document.getElementById('nextSourceBtn');
    const watchBtn = document.getElementById('watchBtn');

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
    let allAnimeData = {};

    // ===== AUTH =====
    let currentUser = JSON.parse(localStorage.getItem('animeUser') || 'null');

    function updateAuthUI() {
        if (currentUser) {
            authBtns.style.display = 'none';
            userInfo.style.display = 'flex';
            userNameDisplay.innerHTML = `<i class="fas fa-user"></i> ${currentUser.username}`;
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
        } else {
            favs.push(id);
        }
        currentUser.favorites = favs;
        saveUserData();
        renderCurrentView();
        updateCardButtons();
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
        } else {
            watched.push(id
