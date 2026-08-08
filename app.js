// ============================================================
// APP.JS - С KODIKWRAPPER (ПРАВИЛЬНАЯ ВЕРСИЯ)
// ============================================================

// Импортируем kodikwrapper
const { Client } = require('kodikwrapper');

// ===== СОЗДАЕМ КЛИЕНТ С ВАШИМ ТОКЕНОМ =====
const client = new Client({
    token: '83d3509b456cfd7448e89f81da83eb1a',
});

(function() {
    'use strict';

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
    const debugInfo = document.getElementById('debugInfo');

    let currentResults = [];
    let currentAnime = null;
    let isLoading = false;
    let currentKodikMaterial = null;

    // ===== ЗАПРОС К ANILIST =====
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

    // ===== ПОИСК В KODIK ПО ID (shikimori_id) =====
    async function searchKodikById(anilistId) {
        try {
            // AniList ID часто совпадает с Shikimori ID
            const response = await client.search({ 
                shikimori_id: String(anilistId) 
            });
            
            debugInfo.textContent = `Поиск по ID ${anilistId}: ${JSON.stringify(response, null, 2)}`;
            debugInfo.classList.add('show');

            if (response && response.results && response.results.length > 0) {
                return response.results[0];
            }
            return null;
        } catch (error) {
            console.error('Kodik search by ID error:', error);
            debugInfo.textContent += `\nОшибка: ${error.message}`;
            return null;
        }
    }

    // ===== ПОИСК В KODIK ПО НАЗВАНИЮ =====
    async function searchKodikByTitle(title) {
        try {
            const response = await client.search({ 
                title: title,
                limit: 1
            });
            
            debugInfo.textContent = `Поиск по названию "${title}": ${JSON.stringify(response, null, 2)}`;
            debugInfo.classList.add('show');

            if (response && response.results && response.results.length > 0) {
                return response.results[0];
            }
            return null;
        } catch (error) {
            console.error('Kodik search by title error:', error);
            debugInfo.textContent += `\nОшибка: ${error.message}`;
            return null;
        }
    }

    // ===== ПОЛУЧИТЬ ССЫЛКУ НА ПЛЕЕР ИЗ MATERIAL =====
    function getKodikPlayerUrl(material, episode) {
        if (!material) return null;

        // Вариант 1:直接用 link из ответа
        if (material.link) {
            let url = material.link;
            if (url.startsWith('//')) {
                url = 'https:' + url;
            }
            return url;
        }

        // Вариант 2: Сформировать ссылку по id
        if (material.id) {
            return `https://kodik.info/player/${material.id}/${episode}`;
        }

        // Вариант 3: По hash
        if (material.hash) {
            return `https://kodik.info/player/${material.hash}/${episode}`;
        }

        return null;
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
                <div class="card" data-id="${anime.id}" data-title="${encodeURIComponent(title)}">
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
            el.addEventListener('click', async function() {
                const id = parseInt(this.dataset.id);
                const title = decodeURIComponent(this.dataset.title);
                const anime = currentResults.find(a => a.id === id);
                if (anime) {
                    await openPlayer(anime, title);
                }
            });
        });
    }

    // ===== ОТКРЫТЬ ПЛЕЕР =====
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

        setStatus(`⏳ Поиск в Kodik...`, 'info');
        sourceStatus.textContent = `🔍 Поиск...`;
        debugInfo.textContent = `ID: ${anime.id}, Название: ${animeTitle}`;
        debugInfo.classList.add('show');

        try {
            // Пробуем поиск по ID (shikimori_id)
            let material = await searchKodikById(anime.id);
            
            // Если не найдено по ID - ищем по названию
            if (!material) {
                debugInfo.textContent += `\nПо ID не найдено, ищем по названию...`;
                material = await searchKodikByTitle(animeTitle);
            }

            if (material) {
                currentKodikMaterial = material;
                debugInfo.textContent += `\nНайдено: ${material.title || material.id}`;
                setStatus(`✅ Найдено в Kodik!`, 'success');
                sourceStatus.textContent = `🎬 Загрузка...`;

                const ep = parseInt(episodeSelect.value) || 1;
                const playerUrl = getKodikPlayerUrl(material, ep);

                if (playerUrl) {
                    debugInfo.textContent += `\nПлеер: ${playerUrl}`;
                    playerFrame.src = playerUrl;

                    playerFrame.onload = function() {
                        setStatus(`✅ Видео загружено!`, 'success');
                        sourceStatus.textContent = '✅ Kodik работает';
                    };

                    playerFrame.onerror = function() {
                        setStatus('❌ Ошибка плеера', 'error');
                        sourceStatus.textContent = '❌ Ошибка';
                    };
                } else {
                    setStatus('❌ Не удалось получить ссылку', 'error');
                    sourceStatus.textContent = '❌ Нет ссылки';
                }
            } else {
                setStatus(`❌ Не найдено в Kodik`, 'error');
                sourceStatus.textContent = '❌ Не найдено';
                debugInfo.textContent += `\nНичего не найдено в Kodik`;
            }

        } catch (error) {
            console.error('Open player error:', error);
            setStatus(`❌ Ошибка: ${error.message}`, 'error');
            sourceStatus.textContent = '❌ Ошибка';
            debugInfo.textContent += `\nОшибка: ${error.message}`;
        }

        setTimeout(() => {
            player.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // ===== СМЕНА СЕРИИ =====
    async function changeEpisode() {
        if (currentAnime && currentKodikMaterial) {
            const ep = parseInt(episodeSelect.value) || 1;
            const playerUrl = getKodikPlayerUrl(currentKodikMaterial, ep);
            if (playerUrl) {
                playerFrame.src = playerUrl;
                setStatus(`✅ Серия ${ep} загружена`, 'success');
                sourceStatus.textContent = `🎬 Серия ${ep}`;
            }
        }
    }

    // ===== ОБНОВИТЬ =====
    async function reloadPlayer() {
        if (currentAnime && currentKodikMaterial) {
            const ep = parseInt(episodeSelect.value) || 1;
            const playerUrl = getKodikPlayerUrl(currentKodikMaterial, ep);
            if (playerUrl) {
                playerFrame.src = playerUrl;
                setStatus(`✅ Перезагружено`, 'success');
                sourceStatus.textContent = '🔄 Обновлено';
            }
        } else if (currentAnime) {
            const title = currentAnime.title?.romaji || currentAnime.title?.english || 'Аниме';
            await openPlayer(currentAnime, title);
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
        currentKodikMaterial = null;
        debugInfo.classList.remove('show');
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
