// ============================================================
// ТОЛЬКО VK ПЛЕЕР
// ============================================================

(function() {
    'use strict';

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const results = document.getElementById('results');
    const player = document.getElementById('player');
    const playerTitle = document.getElementById('playerTitle');
    const playerFrame = document.getElementById('playerFrame');
    const closePlayer = document.getElementById('closePlayer');
    const playerStatus = document.getElementById('playerStatus');

    // ===== ПОИСК ТОЛЬКО В VK =====
    async function searchVK(query) {
        try {
            // Прямой запрос к VK API
            const url = `https://api.vk.com/method/video.search?q=${encodeURIComponent(query)}&count=15&sort=2&hd=1&v=5.131`;
            const response = await fetch(url);
            const data = await response.json();

            console.log('VK ответ:', data);

            if (data.response && data.response.items && data.response.items.length > 0) {
                return data.response.items.map(item => ({
                    id: item.id,
                    title: item.title || 'Без названия',
                    source: 'VK',
                    thumbnail: item.image?.[0]?.url || '',
                    url: `https://vk.com/video_ext.php?oid=${item.owner_id}&id=${item.id}&hash=${item.access_key || ''}`,
                    duration: item.duration || 0,
                    views: item.views || 0
                }));
            }
            return [];
        } catch (error) {
            console.error('VK ошибка:', error);
            return [];
        }
    }

    // ===== ПОИСК =====
    async function searchVideos(query) {
        if (!query.trim()) {
            results.innerHTML = `<div class="empty"><i class="fas fa-search"></i><h3>Введите запрос</h3></div>`;
            return;
        }

        results.innerHTML = `<div class="loading"><div class="spinner"></div><p>Поиск в VK...</p></div>`;

        try {
            const videos = await searchVK(query);

            if (videos.length === 0) {
                results.innerHTML = `
                    <div class="empty">
                        <i class="fas fa-video-slash"></i>
                        <h3>Ничего не найдено в VK</h3>
                        <p style="color:#555;">Попробуйте другой запрос</p>
                        <button onclick="searchVideos('one piece 1 серия')" style="margin-top:10px;padding:8px 20px;border-radius:20px;border:none;background:#7c3aed;color:#fff;cursor:pointer;">Пример: one piece 1 серия</button>
                    </div>
                `;
                return;
            }

            renderResults(videos);

        } catch (error) {
            results.innerHTML = `
                <div class="empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ошибка</h3>
                    <p style="color:#555;">${error.message}</p>
                </div>
            `;
        }
    }

    // ===== ОТОБРАЖЕНИЕ =====
    function renderResults(videos) {
        let html = '';
        for (const video of videos) {
            html += `
                <div class="result-item" data-url="${video.url}" data-title="${video.title}">
                    <img class="thumb" src="${video.thumbnail || ''}" 
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22168%22%3E%3Crect fill=%22%2314142a%22 width=%22300%22 height=%22168%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 fill=%22%23555%22 text-anchor=%22middle%22 dominant-baseline=%22central%22%3ENo preview%3C/text%3E%3C/svg%3E'" />
                    <div class="info">
                        <h4>${escapeHtml(video.title)}</h4>
                        <span class="source">📺 VK ${video.duration ? '· ' + formatDuration(video.duration) : ''}</span>
                    </div>
                </div>
            `;
        }
        results.innerHTML = html;

        document.querySelectorAll('.result-item').forEach(el => {
            el.addEventListener('click', function() {
                const url = this.dataset.url;
                const title = this.dataset.title;
                openPlayer(url, title);
            });
        });
    }

    // ===== ОТКРЫТЬ ПЛЕЕР =====
    function openPlayer(url, title) {
        player.classList.remove('hidden');
        playerTitle.textContent = '🎬 ' + title;
        playerFrame.src = url;
        playerStatus.textContent = '▶️ Воспроизведение из VK';
        playerStatus.className = 'player-status success';

        setTimeout(() => {
            player.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // ===== ЗАКРЫТЬ =====
    function closePlayerFn() {
        player.classList.add('hidden');
        playerFrame.src = '';
        playerStatus.textContent = '💡 Выберите видео';
        playerStatus.className = 'player-status';
    }

    // ===== ПОМОЩНИКИ =====
    function escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function formatDuration(seconds) {
        if (!seconds) return '';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    // ===== СОБЫТИЯ =====
    searchBtn.addEventListener('click', () => {
        searchVideos(searchInput.value.trim());
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });

    closePlayer.addEventListener('click', closePlayerFn);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !player.classList.contains('hidden')) {
            closePlayerFn();
        }
    });

    // ===== ЗАПУСК =====
    setTimeout(() => {
        searchVideos('one piece 1 серия');
    }, 500);

})();
