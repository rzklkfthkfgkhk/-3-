// ============================================================
// APP.JS - С KODIKWRAPPER
// ============================================================

// Импортируем kodikwrapper
const { Client } = require('kodikwrapper');

// ===== СОЗДАЕМ КЛИЕНТ С ВАШИМ ТОКЕНОМ =====
const client = new Client({
    token: '83d3509b456cfd7448e89f81da83eb1a',
});

// ИЛИ короче:
// const client = Client.fromToken('83d3509b456cfd7448e89f81da83eb1a');

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

    // ===== ПОИСК В KODIK ПО НАЗВАНИЮ =====
    async function searchKodik(title) {
        try {
            const response = await client.search({
                limit: 1,
                title: title,
            });
            
            if (response && response.results && response.results.length > 0) {
                return response.results[0];
            }
            return null;
        } catch (error) {
            console.error('Kodik search error:', error);
            return null;
        }
    }

    // ===== ПОЛУЧИТЬ ССЫЛКУ НА ПЛЕЕР ИЗ KODIK =====
    function getKodikPlayerUrl(material, episode) {
        if (!material) return null;
        
        // У Kodik есть поле link или можно сформировать ссылку
        // Обычно ссылка выглядит так: //aniqit.com/video/ID/HASH/QUALITY
        // Или можно использовать прямой плеер Kodik
        
        // Вариант 1: Использовать link из ответа
        if (material.link) {
            // Добавляем протокол https:// если его нет
            let url = material.link;
            if (url.startsWith('//')) {
                url = 'https:' + url;
            }
            return url;
        }
        
        // Вариант 2: Сформировать ссылку на плеер
        if (material.id) {
            return `https://kodik.info/player/${material.id}/${episode}`;
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

        // Ищем в Kodik по названию
        setStatus(`⏳ Поиск в Kodik: "${animeTitle}"...`, 'info');
        sourceStatus.textContent = `🔍 Поиск Kodik...`;

        try {
            const kodikMaterial = await searchKodik(animeTitle);
            
            if (kodikMaterial) {
                currentKodikMaterial = kodikMaterial;
                console.log('Найдено в Kodik:', kodikMaterial);
                
                const ep = parseInt(episodeSelect.value) || 1;
                await loadKodikPlayer(kodikMaterial, ep);
            } else {
                setStatus(`❌ Не найдено в Kodik: "${animeTitle}"`, 'error');
                sourceStatus.textContent = '❌ Не найдено';
            }
        } catch (error) {
            console.error('Kodik error:', error);
            setStatus(`❌ Ошибка Kodik: ${error.message}`, 'error');
            sourceStatus.textContent = '❌ Ошибка';
        }

        setTimeout(() => {
            player.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // ===== ЗАГРУЗКА ПЛЕЕРА KODIK =====
    async function loadKodikPlayer(material, episode) {
        try {
            const playerUrl = getKodikPlayerUrl(material, episode);
            
            if (!playerUrl) {
                setStatus('❌ Не удалось получить ссылку на плеер', 'error');
                sourceStatus.textContent = '❌ Нет ссылки';
                return;
            }

            console.log('Kodik плеер URL:', playerUrl);
            
            setStatus(`✅ Загрузка плеера Kodik...`, 'info');
            sourceStatus.textContent = `🎬 Kodik (серия ${episode})`;

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
            console.error('Load Kodik error:', error);
            setStatus(`❌ Ошибка: ${error.message}`, 'error');
            sourceStatus.textContent = '❌ Ошибка';
        }
    }

    // ===== СМЕНА СЕРИИ =====
    async function changeEpisode() {
        if (currentAnime && currentKodikMaterial) {
            const ep = parseInt(episodeSelect.value) || 1;
            await loadKodikPlayer(currentKodikMaterial, ep);
        }
    }

    // ===== ОБНОВИТЬ =====
    async function reloadPlayer() {
        if (currentAnime && currentKodikMaterial) {
            const ep = parseInt(episodeSelect.value) || 1;
            await loadKodikPlayer(currentKodikMaterial, ep);
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
