// ============================================================
// APP.JS - ТОЛЬКО KODIK
// ============================================================

(function() {
    'use strict';

    // ===== ТОКЕН KODIK =====
    const KODIK_TOKEN = '83d3509b456cfd7448e89f81da83eb1a';

    // DOM
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const grid = document.getElementById('grid');
    const count = document.getElementById('count');
    const logo = document.getElementById('logoLink');

    const player = document.getElementById('player');
    const playerTitle = document.getElementById('playerTitle');
    const playerFrame = document.getElementById('playerFrame');
    const closePlayer = document.getElementById('closePlayer');
    const episodeSelect = document.getElementById('episodeSelect');
    const statusMsg = document.getElementById('statusMsg');
    const sourceStatus = document.getElementById('sourceStatus');
    const reloadBtn = document.getElementById('reloadBtn');

    let currentResults = [];
    let currentAnime = null;
    let isLoading = false;

    // ===== ЗАПРОС К ANILIST =====
    const QUERY = `
        query ($search: String) {
            Page(page: 1, perPage: 30) {
                media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
                    id
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

    // ===== ПОЛУЧИТЬ ССЫЛКУ НА ПЛЕЕР ЧЕРЕЗ KODIK API =====
    async function getKodikPlayerUrl(hash, episode) {
        try {
            // Прямой запрос к Kodik API с токеном
            const url = `https://kodikapi.com/get-player?token=${KODIK_TOKEN}&hash=${hash}&episode=${episode}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Проверяем разные варианты ответа
            if (data && data.url) {
                return data.url;
            } else if (data && data.link) {
                return data.link;
            } else if (data && data.player) {
                return data.player;
            } else {
                // Если API вернул нестандартный ответ, используем прямой embed
                console.warn('Kodik вернул нестандартный ответ:', data);
                return `https://kodik.info/player/${hash}/${episode}`;
            }
        } catch (error) {
            console.error('Kodik API error:', error);
            // Если API не работает, используем прямой embed
            return `https://kodik.info/player/${hash}/${episode}`;
        }
    }

    // ===== ПОИСК =====
    async function search(query) {
        if (!query?.trim()) {
            showEmpty('Введите название');
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
            if (json.errors) {
                throw new Error(json.errors[0]?.message || 'Ошибка');
            }

            const media = json?.data?.Page?.media || [];
            currentResults = media;

            if (!media.length) {
                showEmpty('Ничего не найдено');
                updateCount(0);
                return;
            }

            renderCards(media);
            updateCount(media.length);

        } catch (err) {
            console.error(err);
            showEmpty(`❌ ${err.message}`);
            updateCount('⚠️');
        } finally {
            isLoading = false;
        }
    }

    // ===== КАРТОЧКИ =====
    function renderCards(list) {
        let html = '';
        for (const anime of list) {
            const title = anime.title?.romaji || anime.title?.english || 'Без названия';
            const cover = anime.coverImage?.extraLarge || anime.coverImage?.large || '';
            const genres = (anime.genres || []).slice(0, 2).join(' · ');
            const score = anime.averageScore ? Math.round(anime.averageScore / 10) : '—';
            const episodes = anime.episodes || '?';
            const status = anime.status || 'UNKNOWN';
            const statusLabel = status === 'RELEASING' ? '🟢 Выходит' : status === 'FINISHED' ? '🔵 Завершён' : '⚪ Скоро';

            html += `
                <div class="card" data-id="${anime.id}">
                    <img src="${cover}" alt="${title}" loading="lazy"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22%3E%3Crect fill=%22%231a1a2e%22 width=%22300%22 height=%22450%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 fill=%22%23666%22 text-anchor=%22middle%22 dominant-baseline=%22central%22%3ENo Image%3C/text%3E%3C/svg%3E'" />
                    <div class="card-body">
                        <h3>${escapeHtml(title)}</h3>
                        ${genres ? `<div style="font-size:12px;color:#888;">${escapeHtml(genres)}</div>` : ''}
                        <div class="info">
                            <span>${anime.format || 'TV'}</span>
                            <span>⭐ ${score}</span>
                            <span>${episodes} эп.</span>
                        </div>
                        <div style="font-size:12px;color:#666;margin-top:4px;">${statusLabel}</div>
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

    // ===== ОТКРЫТЬ ПЛЕЕР =====
    async function openPlayer(anime) {
        currentAnime = anime;
        const title = anime.title?.romaji || anime.title?.english || 'Аниме';

        player.classList.remove('hidden');
        playerTitle.textContent = '🎬 ' + title;

        const total = anime.episodes || 12;
        episodeSelect.innerHTML = '';
        for (let i = 1; i <= Math.min(total, 50); i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `Серия ${i}`;
            episodeSelect.appendChild(opt);
        }

        const ep = parseInt(episodeSelect.value) || 1;
        await loadKodik(anime.id, ep);

        setTimeout(() => {
            player.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // ===== ЗАГРУЗКА KODIK =====
    async function loadKodik(id, episode) {
        try {
            setStatus(`⏳ Запрос к Kodik API...`, 'info');
            sourceStatus.textContent = `🎬 Kodik (серия ${episode})`;

            // Получаем ссылку на плеер через API
            const playerUrl = await getKodikPlayerUrl(id, episode);
            
            console.log('Kodik URL:', playerUrl);
            
            setStatus(`✅ Ссылка получена, загрузка...`, 'info');
            sourceStatus.textContent = `🎬 Загрузка плеера`;

            // Загружаем плеер
            playerFrame.src = playerUrl;

            playerFrame.onload = function() {
                setStatus(`✅ Видео загружено через Kodik!`, 'success');
                sourceStatus.textContent = '✅ Kodik работает';
            };

            playerFrame.onerror = function() {
                setStatus('❌ Ошибка загрузки плеера', 'error');
                sourceStatus.textContent = '❌ Ошибка';
            };

        } catch (error) {
            console.error('Kodik error:', error);
            setStatus(`❌ Ошибка: ${error.message}`, 'error');
            sourceStatus.textContent = '❌ Ошибка API';
            
            // Пробуем прямой embed как запасной вариант
            try {
                const fallbackUrl = `https://kodik.info/player/${id}/${episode}`;
                playerFrame.src = fallbackUrl;
                setStatus(`⚠️ Использую запасной плеер`, 'info');
                sourceStatus.textContent = '🎬 Запасной плеер';
            } catch (e) {
                setStatus('❌ Не удалось загрузить видео', 'error');
            }
        }
    }

    // ===== СМЕНА СЕРИИ =====
    async function changeEpisode() {
        if (currentAnime) {
            const ep = parseInt(episodeSelect.value) || 1;
            await loadKodik(currentAnime.id, ep);
        }
    }

    // ===== ОБНОВИТЬ =====
    async function reloadPlayer() {
        if (currentAnime) {
            const ep = parseInt(episodeSelect.value) || 1;
            await loadKodik(currentAnime.id, ep);
        }
    }

    // ===== СТАТУС =====
    function setStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.className = 'msg ' + (type || 'info');
    }

    // ===== ЗАКРЫТЬ =====
    function closePlayerFn() {
        player.classList.add('hidden');
        playerFrame.src = '';
        currentAnime = null;
    }

    // ===== НА ГЛАВНУЮ =====
    function goHome() {
        closePlayerFn();
        showEmpty('Найдите аниме');
        updateCount(0);
        document.querySelector('.header').scrollIntoView({ behavior: 'smooth' });
    }

    // ===== UI =====
    function showEmpty(msg) {
        grid.innerHTML = `
            <div class="empty">
                <div style="font-size:48px;">🔍</div>
                <h3>${msg}</h3>
                <p style="color:#555;">Введите название</p>
            </div>
        `;
    }

    function showLoading() {
        grid.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p style="color:#888;margin-top:12px;">Загрузка...</p>
            </div>
        `;
    }

    function updateCount(val) {
        if (typeof val === 'number') {
            count.textContent = `${val} аниме`;
        } else {
            count.textContent = val;
        }
    }

    function escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    // ===== СОБЫТИЯ =====
    searchBtn.addEventListener('click', () => {
        search(searchInput.value.trim());
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });

    closePlayer.addEventListener('click', closePlayerFn);
    episodeSelect.addEventListener('change', changeEpisode);
    reloadBtn.addEventListener('click', reloadPlayer);

    logo.addEventListener('click', (e) => {
        e.preventDefault();
        goHome();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !player.classList.contains('hidden')) {
            closePlayerFn();
        }
    });

    // ===== ЗАПУСК =====
    showEmpty('Найдите аниме');
    updateCount(0);

    setTimeout(() => {
        search('one piece');
    }, 300);

})();
