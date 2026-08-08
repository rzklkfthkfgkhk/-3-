(function() {
    'use strict';

    // DOM
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const grid = document.getElementById('grid');
    const count = document.getElementById('count');
    const logo = document.getElementById('logoLink');
    
    const player = document.getElementById('player');
    const playerBody = document.getElementById('playerBody');
    const playerTitle = document.getElementById('playerTitle');
    const playerFrame = document.getElementById('playerFrame');
    const closePlayer = document.getElementById('closePlayer');
    const collapsePlayer = document.getElementById('collapsePlayer');
    const episodeSelect = document.getElementById('episodeSelect');
    const statusMsg = document.getElementById('statusMsg');
    const sourceStatus = document.getElementById('sourceStatus');

    // Мини-плеер
    const miniPlayer = document.getElementById('miniPlayer');
    const miniTitle = document.getElementById('miniTitle');
    const expandPlayer = document.getElementById('expandPlayer');
    const closeMiniPlayer = document.getElementById('closeMiniPlayer');

    let currentResults = [];
    let currentAnime = null;
    let isLoading = false;
    let isCollapsed = false;

    // ===== GraphQL Query =====
    const QUERY = `
        query ($search: String) {
            Page(page: 1, perPage: 30) {
                media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
                    id
                    idMal
                    title { romaji english native }
                    coverImage { large extraLarge }
                    format
                    episodes
                    status
                    averageScore
                    genres
                }
            }
        }
    `;

    // ===== REAL WORKING SOURCES =====
    const SOURCES = [
        'https://animeflix.live/embed/',
        'https://gogoanime.llc/embed/',
        'https://aniwatch.to/embed/',
        'https://zoro.to/embed/',
        'https://allanime.to/embed/',
        'https://animepahe.com/embed/',
        'https://9anime.to/embed/'
    ];

    // ===== SEARCH =====
    async function search(query) {
        if (!query?.trim()) {
            showEmpty('Введите название аниме');
            updateCount(0);
            return;
        }

        if (isLoading) return;
        isLoading = true;

        showLoading();
        updateCount('⏳');

        try {
            const res = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: QUERY,
                    variables: { search: query.trim() }
                })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();
            if (json.errors) throw new Error('Ошибка GraphQL');

            const media = json?.data?.Page?.media || [];
            currentResults = media;

            if (!media.length) {
                showEmpty('Ничего не найдено 😢');
                updateCount(0);
                return;
            }

            renderCards(media);
            updateCount(media.length);

        } catch (err) {
            console.error(err);
            showEmpty(`Ошибка: ${err.message}`);
            updateCount('⚠️');
        } finally {
            isLoading = false;
        }
    }

    // ===== RENDER =====
    function renderCards(list) {
        let html = '';
        for (const anime of list) {
            const title = anime.title?.romaji || anime.title?.english || 'Без названия';
            const cover = anime.coverImage?.extraLarge || anime.coverImage?.large || '';
            const genres = (anime.genres || []).slice(0, 2).join(' · ');
            const score = anime.averageScore ? Math.round(anime.averageScore / 10) : '—';
            const episodes = anime.episodes || '?';
            const status = anime.status || 'UNKNOWN';
            
            const dotClass = status === 'RELEASING' ? 'green' : status === 'FINISHED' ? 'blue' : 'gray';
            const statusLabel = status === 'RELEASING' ? 'Выходит' : status === 'FINISHED' ? 'Завершён' : 'Скоро';

            html += `
                <div class="card" data-id="${anime.id}">
                    <img src="${cover}" alt="${title}" loading="lazy" 
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22%3E%3Crect fill=%22%2312122a%22 width=%22300%22 height=%22450%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 fill=%22%235a5a7e%22 text-anchor=%22middle%22 dominant-baseline=%22central%22%3ENo Image%3C/text%3E%3C/svg%3E'" />
                    <div class="card-body">
                        <h3>${escapeHtml(title)}</h3>
                        ${genres ? `<div class="genres">${escapeHtml(genres)}</div>` : ''}
                        <div class="tags">
                            <span>${anime.format || 'TV'}</span>
                            <span class="score"><i class="fas fa-star"></i> ${score}</span>
                            <span>${episodes} эп.</span>
                        </div>
                        <div class="status">
                            <span class="dot ${dotClass}"></span>
                            ${statusLabel}
                        </div>
                    </div>
                </div>
            `;
        }
        grid.innerHTML = html;

        document.querySelectorAll('.card').forEach(el => {
            el.addEventListener('click', function() {
                const id = parseInt(this.dataset.id);
                const anime = currentResults.find(a => a.id === id);
                if (anime) openPlayer(anime);
            });
        });
    }

    // ===== OPEN PLAYER =====
    function openPlayer(anime) {
        currentAnime = anime;
        const title = anime.title?.romaji || anime.title?.english || 'Аниме';
        
        player.classList.remove('hidden');
        miniPlayer.classList.add('hidden');
        isCollapsed = false;
        player.classList.remove('collapsed');
        playerTitle.textContent = title;
        miniTitle.textContent = title;
        
        // Настраиваем серии
        const total = anime.episodes || 12;
        episodeSelect.innerHTML = '';
        for (let i = 1; i <= Math.min(total, 50); i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `Серия ${i}`;
            episodeSelect.appendChild(opt);
        }
        
        // Загружаем первую серию
        loadEpisode(anime.id, 1);
        
        setTimeout(() => {
            player.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // ===== LOAD EPISODE =====
    function loadEpisode(id, episode) {
        let loaded = false;
        let currentSource = 0;

        function trySource() {
            if (currentSource >= SOURCES.length || loaded) {
                if (!loaded) {
                    setStatus('Не удалось загрузить видео. Попробуйте другую серию.', 'error');
                    sourceStatus.innerHTML = `<i class="fas fa-exclamation-circle"></i> <span>Все источники недоступны</span>`;
                }
                return;
            }

            const url = `${SOURCES[currentSource]}${id}?ep=${episode}`;
            playerFrame.src = url;
            sourceStatus.innerHTML = `
                <i class="fas fa-sync-alt fa-spin"></i>
                <span>Источник ${currentSource + 1}/${SOURCES.length}</span>
            `;

            playerFrame.onload = function() {
                loaded = true;
                setStatus(`Серия ${episode} загружена!`, 'success');
                sourceStatus.innerHTML = `
                    <i class="fas fa-check-circle" style="color:#4ade80;"></i>
                    <span>Видео загружено</span>
                `;
            };

            setTimeout(() => {
                if (!loaded) {
                    currentSource++;
                    trySource();
                }
            }, 5000);
        }

        setStatus('Загрузка видео...', 'info');
        sourceStatus.innerHTML = `<i class="fas fa-sync-alt fa-spin"></i> <span>Поиск источника...</span>`;
        currentSource = 0;
        trySource();
    }

    // ===== CHANGE EPISODE =====
    function changeEpisode() {
        if (currentAnime) {
            const ep = parseInt(episodeSelect.value);
            loadEpisode(currentAnime.id, ep);
        }
    }

    // ===== STATUS =====
    function setStatus(msg, type) {
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle'
        };
        statusMsg.className = `status-msg ${type || 'info'}`;
        statusMsg.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> <span>${msg}</span>`;
    }

    // ===== COLLAPSE / EXPAND =====
    function toggleCollapse() {
        isCollapsed = !isCollapsed;
        if (isCollapsed) {
            player.classList.add('collapsed');
            miniPlayer.classList.remove('hidden');
            // Обновляем название в мини-плеере
            if (currentAnime) {
                const title = currentAnime.title?.romaji || currentAnime.title?.english || 'Аниме';
                miniTitle.textContent = title;
            }
        } else {
            player.classList.remove('collapsed');
            miniPlayer.classList.add('hidden');
            // Прокручиваем к плееру
            setTimeout(() => {
                player.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    // ===== CLOSE =====
    function closePlayerFn() {
        player.classList.add('hidden');
        miniPlayer.classList.add('hidden');
        playerFrame.src = '';
        currentAnime = null;
        isCollapsed = false;
        player.classList.remove('collapsed');
    }

    // ===== GO HOME =====
    function goHome() {
        closePlayerFn();
        showEmpty('Найдите любимое аниме');
        updateCount(0);
        document.querySelector('.header').scrollIntoView({ behavior: 'smooth' });
    }

    // ===== UI HELPERS =====
    function showEmpty(msg) {
        grid.innerHTML = `
            <div class="empty">
                <i class="fas fa-search"></i>
                <h3>${msg}</h3>
                <p>Введите название в поиск</p>
            </div>
        `;
    }

    function showLoading() {
        grid.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Загрузка аниме...</p>
            </div>
        `;
    }

    function updateCount(val) {
        const span = count.querySelector('span') || count;
        if (typeof val === 'number') {
            span.textContent = `${val} аниме`;
        } else {
            span