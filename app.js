// ============================================================
// APP.JS - С KODIKWRAPPER И VideoLinks
// ============================================================

// Импортируем kodikwrapper
const { Client, VideoLinks } = require('kodikwrapper');

// ===== СОЗДАЕМ КЛИЕНТ С ВАШИМ ТОКЕНОМ =====
const client = Client.fromToken('83d3509b456cfd7448e89f81da83eb1a');

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
    const qualitySelect = document.getElementById('qualitySelect');

    let currentResults = [];
    let currentAnime = null;
    let isLoading = false;
    let currentKodikMaterial = null;
    let currentVideoLinks = null;

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

    // ===== ПОИСК В KODIK ПО ID =====
    async function searchKodikById(anilistId) {
        try {
            const response = await client.search({ 
                shikimori_id: String(anilistId) 
            });
            
            debugInfo.textContent = `🔍 Поиск по ID ${anilistId}`;
            debugInfo.classList.add('show');

            if (response && response.results && response.results.length > 0) {
                return response.results[0];
            }
            return null;
        } catch (error) {
            console.error('Kodik search error:', error);
            debugInfo.textContent += `\n❌ Ошибка: ${error.message}`;
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
            
            debugInfo.textContent = `🔍 Поиск по названию: "${title}"`;
            debugInfo.classList.add('show');

            if (response && response.results && response.results.length > 0) {
                return response.results[0];
            }
            return null;
        } catch (error) {
            console.error('Kodik search error:', error);
            debugInfo.textContent += `\n❌ Ошибка: ${error.message}`;
            return null;
        }
    }

    // ===== ПОЛУЧИТЬ ВИДЕО-ССЫЛКИ ЧЕРЕЗ VideoLinks =====
    async function getVideoLinks(material) {
        try {
            if (!material || !material.link) {
                throw new Error('Нет ссылки на материал');
            }

            debugInfo.textContent += `\n📹 Получение видео-ссылок...`;
            
            const links = await VideoLinks.getLinks({
                link: material.link,
            });

            debugInfo.textContent += `\n✅ Получено ${Object.keys(links).length} качеств: ${Object.keys(links).join(', ')}`;
            
            return links;
        } catch (error) {
            console.error('VideoLinks error:', error);
            debugInfo.textContent += `\n❌ Ошибка получения видео: ${error.message}`;
            return null;
        }
    }

    // ===== ВОСПРОИЗВЕДЕНИЕ ВИДЕО =====
    function playVideo(links, quality) {
        if (!links) {
            setStatus('❌ Нет видео-ссылок', 'error');
            return;
        }

        // Определяем доступные качества
        const qualities = Object.keys(links).sort((a, b) => parseInt(a) - parseInt(b));
        
        if (qualities.length === 0) {
            setStatus('❌ Нет доступных качеств', 'error');
            return;
        }

        // Если качество не указано или недоступно - берем лучшее
        let selectedQuality = quality || qualities[qualities.length - 1];
        if (!links[selectedQuality]) {
            selectedQuality = qualities[qualities.length - 1];
        }

        const videoData = links[selectedQuality];
        if (!videoData || videoData.length === 0) {
            setStatus('❌ Нет видео для выбранного качества', 'error');
            return;
        }

        // Берем первую ссылку
        let videoUrl = videoData[0].src;
        if (videoUrl.startsWith('//')) {
            videoUrl = 'https:' + videoUrl;
        }

        debugInfo.textContent += `\n▶️ Качество: ${selectedQuality}p`;
        debugInfo.textContent += `\n🔗 Ссылка: ${videoUrl}`;

        // Обновляем select качества
        qualitySelect.innerHTML = '';
        qualities.forEach(q => {
            const opt = document.createElement('option');
            opt.value = q;
            opt.textContent = `${q}p`;
            if (q === selectedQuality) opt.selected = true;
            qualitySelect.appendChild(opt);
        });

        // Загружаем видео в iframe (для HLS используем специальный плеер)
        // Для HLS видео лучше использовать hls.js, но для простоты используем iframe
        // или video тег с hls.js
        const isHls = videoUrl.includes('.m3u8');
        
        if (isHls) {
            // Для HLS используем специальный плеер или hls.js
            // Пока просто загружаем в iframe
            playerFrame.src = videoUrl;
        } else {
            playerFrame.src = videoUrl;
        }

        setStatus(`▶️ Воспроизведение ${selectedQuality}p`, 'success');
        sourceStatus.textContent = `🎬 ${selectedQuality}p`;
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
        debugInfo.textContent = `📺 ${animeTitle} (ID: ${anime.id})`;
        debugInfo.classList.add('show');

        try {
            // Ищем в Kodik
            let material = await searchKodikById(anime.id);
            
            if (!material) {
                debugInfo.textContent += `\n⚠️ По ID не найдено, ищем по названию...`;
                material = await searchKodikByTitle(animeTitle);
            }

            if (material) {
                currentKodikMaterial = material;
                debugInfo.textContent += `\n✅ Найдено: ${material.title || material.id}`;
                setStatus(`✅ Найдено в Kodik!`, 'success');
                sourceStatus.textContent = `📹 Получение видео...`;

                // Получаем видео-ссылки
                const links = await getVideoLinks(material);
                
                if (links) {
                    currentVideoLinks = links;
                    // Воспроизводим в лучшем качестве
                    playVideo(links);
                } else {
                    setStatus('❌ Не удалось получить видео', 'error');
                    sourceStatus.textContent = '❌ Ошибка';
                }
            } else {
                setStatus(`❌ Не найдено в Kodik`, 'error');
                sourceStatus.textContent = '❌ Не найдено';
                debugInfo.textContent += `\n❌ Ничего не найдено`;
            }

        } catch (error) {
            console.error('Open player error:', error);
            setStatus(`❌ Ошибка: ${error.message}`, 'error');
            sourceStatus.textContent = '❌ Ошибка';
            debugInfo.textContent += `\n❌ Ошибка: ${error.message}`;
        }

        setTimeout(() => {
            player.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // ===== СМЕНА КАЧЕСТВА =====
    function changeQuality() {
        if (currentVideoLinks) {
            const quality = qualitySelect.value;
            playVideo(currentVideoLinks, quality);
        }
    }

    // ===== СМЕНА СЕРИИ =====
    async function changeEpisode() {
        if (currentAnime) {
            const title = currentAnime.title?.romaji || currentAnime.title?.english || 'Аниме';
            await openPlayer(currentAnime, title);
        }
    }

    // ===== ОБНОВИТЬ =====
    async function reloadPlayer() {
        if (currentAnime) {
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
        currentVideoLinks = null;
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
    qualitySelect.addEventListener('change', changeQuality);

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
