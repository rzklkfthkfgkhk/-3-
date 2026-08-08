const ANILIST_API = "https://graphql.anilist.co";

const state = {
  route: "home",
  authUser: JSON.parse(localStorage.getItem("authUser") || "null"),
  users: JSON.parse(localStorage.getItem("users") || "{}"),
  favorites: JSON.parse(localStorage.getItem("favorites") || "[]"),
  watched: JSON.parse(localStorage.getItem("watched") || "[]"),
  dropped: JSON.parse(localStorage.getItem("dropped") || "[]"),
  theme: localStorage.getItem("theme") || "dark",
  currentTab: "favorites",
  currentAnime: null,
  trending: []
};

const view = document.getElementById("view");
const toast = document.getElementById("toast");

document.documentElement.setAttribute("data-theme", state.theme);
document.getElementById("themeToggle").textContent = state.theme === "dark" ? "Светлая" : "Тёмная";

function saveAll() {
  localStorage.setItem("authUser", JSON.stringify(state.authUser));
  localStorage.setItem("users", JSON.stringify(state.users));
  localStorage.setItem("favorites", JSON.stringify(state.favorites));
  localStorage.setItem("watched", JSON.stringify(state.watched));
  localStorage.setItem("dropped", JSON.stringify(state.dropped));
  localStorage.setItem("theme", state.theme);
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 2200);
}

async function aniListQuery(query, variables = {}) {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ query, variables })
  });
  return res.json();
}

async function loadTrending(search = "") {
  const query = `
    query ($search: String) {
      Page(perPage: 18) {
        media(type: ANIME, sort: POPULARITY_DESC, search: $search) {
          id
          title { romaji english native }
          coverImage { large }
          episodes
          averageScore
          status
        }
      }
    }
  `;
  const data = await aniListQuery(query, { search: search || null });
  state.trending = data?.data?.Page?.media || [];
  renderHome();
}

function routeTo(route) {
  state.route = route;
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.route === route));
  if (route === "home") renderHome();
  if (route === "profile") renderProfile();
}

function animeTitle(a) {
  return a?.title?.romaji || a?.title?.english || a?.title?.native || "Без названия";
}

function isIn(list, id) {
  return list.some(x => x.id === id);
}

function addTo(listName, anime) {
  const list = state[listName];
  if (!isIn(list, anime.id)) {
    list.push(anime);
    saveAll();
    showToast(`Добавлено в ${listName}`);
  }
}

function removeFrom(listName, id) {
  state[listName] = state[listName].filter(x => x.id !== id);
  saveAll();
}

function cardTemplate(anime) {
  return `
    <div class="card">
      <img src="${anime.coverImage?.large || ""}" alt="${animeTitle(anime)}">
      <div class="card-body">
        <h3>${animeTitle(anime)}</h3>
        <div class="meta">Эпизоды: ${anime.episodes ?? "?"} · Рейтинг: ${anime.averageScore ?? "?"}</div>
        <div class="card-actions">
          <button class="btn primary" data-play="${anime.id}">Смотреть</button>
          <button class="btn" data-fav="${anime.id}">В избранное</button>
          <button class="btn" data-watch="${anime.id}">Просмотрено</button>
          <button class="btn" data-drop="${anime.id}">Брошено</button>
        </div>
      </div>
    </div>
  `;
}

function renderHome() {
  view.innerHTML = document.getElementById("homeView").innerHTML;
  const list = document.getElementById("animeList");
  list.innerHTML = state.trending.map(cardTemplate).join("") || `<p>Ничего не найдено.</p>`;

  document.getElementById("searchBtn").onclick = async () => {
    const q = document.getElementById("searchInput").value.trim();
    await loadTrending(q);
  };

  document.getElementById("loadTrending").onclick = async () => loadTrending();

  list.querySelectorAll("[data-play]").forEach(btn => btn.onclick = () => openPlayer(Number(btn.dataset.play)));
  list.querySelectorAll("[data-fav]").forEach(btn => btn.onclick = () => {
    const a = state.trending.find(x => x.id === Number(btn.dataset.fav));
    addTo("favorites", a);
  });
  list.querySelectorAll("[data-watch]").forEach(btn => btn.onclick = () => {
    const a = state.trending.find(x => x.id === Number(btn.dataset.watch));
    addTo("watched", a);
  });
  list.querySelectorAll("[data-drop]").forEach(btn => btn.onclick = () => {
    const a = state.trending.find(x => x.id === Number(btn.dataset.drop));
    addTo("dropped", a);
  });
}

function renderProfile() {
  if (!state.authUser) {
    routeTo("home");
    showToast("Сначала войдите в аккаунт");
    return;
  }

  view.innerHTML = document.getElementById("profileView").innerHTML;

  const avatar = document.getElementById("profileAvatar");
  const user = state.users[state.authUser.email] || state.authUser;

  avatar.src = user.avatar || `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(user.name || user.email)}`;
  document.getElementById("profileName").textContent = user.name || "Пользователь";
  document.getElementById("profileEmail").textContent = user.email || "";
  document.getElementById("favCount").textContent = state.favorites.length;
  document.getElementById("watchedCount").textContent = state.watched.length;
  document.getElementById("droppedCount").textContent = state.dropped.length;

  const listEl = document.getElementById("profileAnimeList");

  function renderTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    const arr = state[tab];
    listEl.innerHTML = arr.map(anime => `
      <div class="card">
        <img src="${anime.coverImage?.large || ""}" alt="${animeTitle(anime)}">
        <div class="card-body">
          <h3>${animeTitle(anime)}</h3>
          <div class="card-actions">
            <button class="btn primary" data-play="${anime.id}">Смотреть</button>
            <button class="btn" data-remove="${anime.id}">Удалить</button>
          </div>
        </div>
      </div>
    `).join("") || `<p>Список пуст.</p>`;

    listEl.querySelectorAll("[data-play]").forEach(btn => btn.onclick = () => openPlayer(Number(btn.dataset.play)));
    listEl.querySelectorAll("[data-remove]").forEach(btn => btn.onclick = () => {
      removeFrom(tab, Number(btn.dataset.remove));
      renderProfile();
    });
  }

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => renderTab(btn.dataset.tab);
  });

  renderTab(state.currentTab);

  document.getElementById("changeAvatarBtn").onclick = () => document.getElementById("avatarInput").click();
  document.getElementById("avatarInput").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      user.avatar = reader.result;
      state.users[user.email] = user;
      state.authUser = user;
      saveAll();
      renderProfile();
      showToast("Аватар обновлён");
    };
    reader.readAsDataURL(file);
  };
}

async function openPlayer(animeId) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native }
        description(asHtml: false)
        episodes
        coverImage { large }
        siteUrl
        averageScore
      }
    }
  `;
  const data = await aniListQuery(query, { id: animeId });
  const a = data?.data?.Media;
  if (!a) return;

  state.currentAnime = a;
  routeTo("home");
  document.getElementById("playerSection").classList.remove("hidden");
  document.getElementById("playerTitle").textContent = animeTitle(a);

  const info = document.getElementById("animeInfo");
  info.innerHTML = `
    <img src="${a.coverImage?.large || ""}" style="width:100%;border-radius:16px;margin-bottom:12px" alt="">
    <p><b>Название:</b> ${animeTitle(a)}</p>
    <p><b>Эпизоды:</b> ${a.episodes ?? "?"}</p>
    <p><b>Рейтинг:</b> ${a.averageScore ?? "?"}</p>
    <p><b>Ссылка:</b> <a href="${a.siteUrl}" target="_blank" rel="noreferrer">AniList</a></p>
  `;

  const epCount = Math.min(a.episodes || 12, 12);
  const epList = document.getElementById("episodeList");
  epList.innerHTML = Array.from({ length: epCount }, (_, i) => `
    <button class="episode-btn" data-ep="${i + 1}">Серия ${i + 1}</button>
  `).join("");

  epList.querySelectorAll("[data-ep]").forEach(btn => {
    btn.onclick = () => {
      showToast(`Выбрана серия ${btn.dataset.ep}. Подключи официальный embed-источник для просмотра.`);
      document.getElementById("videoFrame").src = "";
    };
  });

  document.getElementById("videoFrame").src =
    "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0";
}

function updateAuthBtn() {
  const authBtn = document.getElementById("authBtn");
  if (state.authUser) {
    authBtn.textContent = "Выйти";
    authBtn.onclick = () => {
      state.authUser = null;
      saveAll();
      updateAuthBtn();
      showToast("Вы вышли");
      routeTo("home");
    };
  } else {
    authBtn.textContent = "Вход";
    authBtn.onclick = () => routeTo("auth");
  }
}

function renderAuth() {
  view.innerHTML = document.getElementById("authView").innerHTML;

  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  loginTab.onclick = () => {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
  };

  registerTab.onclick = () => {
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  };

  document.getElementById("loginBtn").onclick = () => {
    const email = document.getElementById("loginEmail").value.trim();
    const pass = document.getElementById("loginPass").value.trim();
    const u = state.users[email];
    if (!u || u.password !== pass) return showToast("Неверный email или пароль");
    state.authUser = u;
    saveAll();
    updateAuthBtn();
    showToast("Успешный вход");
    routeTo("profile");
  };

  document.getElementById("registerBtn").onclick = () => {
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const pass = document.getElementById("regPass").value.trim();
    if (!name || !email || !pass) return showToast("Заполни все поля");
    if (state.users[email]) return showToast("Пользователь уже существует");

    const user = {
      name, email, password: pass,
      avatar: `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(name)}`
    };
    state.users[email] = user;
    state.authUser = user;
    saveAll();
    updateAuthBtn();
    showToast("Аккаунт создан");
    routeTo("profile");
  };
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.onclick = () => routeTo(btn.dataset.route);
});

document.getElementById("themeToggle").onclick = () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", state.theme);
  document.getElementById("themeToggle").textContent = state.theme === "dark" ? "Светлая" : "Тёмная";
  saveAll();
};

(function init() {
  updateAuthBtn();
  if (state.route === "home") renderHome();
  loadTrending();
})();
