// ---------- data ----------
const gradients = [
  "linear-gradient(150deg,#ff3d71,#7c5cff)",
  "linear-gradient(150deg,#7c5cff,#2bd9c9)",
  "linear-gradient(150deg,#ff7a5c,#ff3d71)",
  "linear-gradient(150deg,#2bd9c9,#3d7bff)",
  "linear-gradient(150deg,#ff3d71,#ffb648)",
  "linear-gradient(150deg,#5c67ff,#ff3d71)",
  "linear-gradient(150deg,#ffb648,#ff3d71)",
  "linear-gradient(150deg,#2bd9c9,#7c5cff)",
];

const heroTitles = [
  { en: "Black Torch", ru: "Qora mash'al", rating: "8.9" },
  { en: "Toumei na Yoru ni Kakeru", ru: "Tun qorong'ligida sizga oshiq bo'ldim", rating: "8.9" },
  { en: "Youjo Senki II", ru: "Kichik qizning harbiy xronikasi", rating: "8.9" },
  { en: "Otome Kaijuu Carameliser", ru: "Karamel mahluqi", rating: "8.6" },
  { en: "Saijo no Osewa", ru: "Eng yaxshiga g'amxo'rlik", rating: "8.5" },
  { en: "Ryoumin 0-nin Start", ru: "Mening yerlarimdagi aholi — nol", rating: "8.5" },
  { en: "Yani Neko", ru: "Tabakoshka", rating: "8.4" },
];

const newTitles = [
  { en: "Unanswered Memories", ru: "Onlayn Qilich Ustasi: Javobsiz xotiralar", meta: "Фильм / 2026" },
  { en: "Quanzhi Fashi VII", ru: "To'liq ish vaqtidagi sehrgar 7", meta: "ONA / 2026" },
  { en: "Tiger & Bunny 2", ru: "Tiger va Bunny 2", meta: "ONA / 2022" },
  { en: "T&B Movie 1", ru: "Tiger va Bunny: Boshlanish", meta: "Фильм / 2012" },
  { en: "T&B Movie 2", ru: "Tiger va Bunny 2: Ko'tarilish", meta: "Фильм / 2014" },
  { en: "Tiger & Bunny", ru: "Tiger va Bunny", meta: "Сериал / 2011" },
  { en: "Seikimatsu Occult", ru: "Okult akademiyasi", meta: "Сериал / 2010" },
  { en: "Mayo Chiki!", ru: "Ey, jo'ja!", meta: "Сериал / 2011" },
  { en: "One Piece: Heroines", ru: "One Piece: Qahramonlar", meta: "Спешл / 2026" },
  { en: "Kiitarou Shounen", ru: "Yosh Kitaro va yokaylar kundaligi", meta: "Сериал / 2016" },
  { en: "Tensei Slime Datta Ken", ru: "Shilimshiq sifatida qayta tug'ilganim", meta: "Фильм / 2026", rating: "8.2" },
  { en: "Binghuo Mochu 2", ru: "Muz va olov ustasi 2", meta: "ONA / 2022" },
];

// ---------- auth / header avatar ----------
function resolveUserPhoto(user) {
  return user?.photo_url || user?.photo || user?.profile_photo || "/assets/default-avatar.svg";
}

function setAuthButtonFromUser(user) {
  const authButton = document.getElementById("authButton");
  if (!authButton || !user) return;

  const photoUrl = resolveUserPhoto(user);

  authButton.href = `/user/${user.telegram_id}`;
  authButton.classList.add("btn-signin", "avatar-state");

  authButton.innerHTML = `
      <img
          src="${photoUrl}"
          class="avatar-img"
          alt="Profil"
          onerror="this.onerror=null;this.src='/assets/default-avatar.svg';"
      >
      <span class="label">Profil</span>
  `;
}

function initAuth() {
  const userData = localStorage.getItem("user");

  // 1) Instant paint from cache, if we have one, so header doesn't flash "Kirish"
  if (userData) {
    try {
      setAuthButtonFromUser(JSON.parse(userData));
    } catch (e) {
      console.warn("Invalid cached user, clearing:", e);
      localStorage.removeItem("user");
    }
  }

  // 2) Always verify/refresh against the server — this is what fixes stale
  //    or incomplete photo data sitting in localStorage.
  fetch('/api/auth/me')
    .then(res => {
      if (!res.ok) throw new Error('Not authenticated');
      return res.json();
    })
    .then(data => {
      const user = data.user || data;
      if (!user) return;
      try { localStorage.setItem('user', JSON.stringify(user)); } catch (e) {}
      setAuthButtonFromUser(user);
    })
    .catch(err => {
      // Not logged in (or request failed) — clear stale cache so we don't
      // show a broken/outdated avatar next visit.
      if (!userData) {
        console.debug('No server-side user:', err.message);
      } else {
        console.warn('Failed to refresh user session:', err.message);
      }
    });
}

initAuth();

// ---------- card rendering ----------
function cardHTML(item, i, big) {
  const grad = gradients[i % gradients.length];
  const badge = item.rating ? `<span class="rating-badge">${item.rating}</span>` : "";
  return `
    <a class="card" href="#">
      <div class="card-cover" style="background:${grad}">
        ${badge}
        <div class="cover-fill"><span>${item.ru}</span></div>
      </div>
      <p class="card-title-en">${item.en}</p>
      <p class="card-title-ru">${item.ru}</p>
      ${item.meta ? `<p class="card-meta">${item.meta}</p>` : ""}
    </a>`;
}

const heroTrack = document.getElementById("hero-track");
if (heroTrack) {
  heroTrack.innerHTML = heroTitles.map((t, i) => cardHTML(t, i)).join("");
}
const newGrid = document.getElementById("new-grid");
if (newGrid) {
  newGrid.innerHTML = newTitles.map((t, i) => cardHTML(t, i)).join("");
}

// ---------- carousel ----------
document.querySelectorAll(".carousel-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const track = document.getElementById(btn.dataset.target);
    const dir = btn.classList.contains("next") ? 1 : -1;
    track.scrollBy({ left: dir * 360, behavior: "smooth" });
  });
});

// ---------- mobile nav ----------
const hamburgerBtn = document.getElementById("hamburgerBtn");
const mobileNav = document.getElementById("mobileNav");
const funcButs = document.querySelector('.func_buts');

function updateFuncButsVisibility() {
  if (!hamburgerBtn || !funcButs) return;
  const hbDisplay = window.getComputedStyle(hamburgerBtn).display;
  if (hbDisplay !== 'none') {
    funcButs.style.display = 'none';
  } else {
    funcButs.style.display = 'flex';
    funcButs.style.gap = '10px';
    funcButs.style.alignItems = 'center';
  }
}

if (hamburgerBtn && mobileNav) {
  hamburgerBtn.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("open");
    hamburgerBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (funcButs) {
      funcButs.style.display = open ? 'none' : '';
      if (!open) updateFuncButsVisibility();
    }
  });

  window.addEventListener('resize', updateFuncButsVisibility);
  window.addEventListener('load', updateFuncButsVisibility);
  updateFuncButsVisibility();
}