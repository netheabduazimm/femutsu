(function () {

  const telegramId = location.pathname.split("/")[2];

  const likedList = document.getElementById("likedList");
  const watchedList = document.getElementById("watchedList");
  const commentList = document.getElementById("userCommentList");

  const gradients = [
    "linear-gradient(150deg,#ff3d71,#7c5cff)",
    "linear-gradient(150deg,#7c5cff,#2bd9c9)",
    "linear-gradient(150deg,#ff7a5c,#ff3d71)",
    "linear-gradient(150deg,#2bd9c9,#3d7bff)",
  ];

  function miniCard(a, i) {
    const poster = a.anime.poster
      ? `background:center/cover no-repeat url('${a.anime.poster}')`
      : `background:${gradients[i % gradients.length]}`;
    return `
      <a class="mini-card" href="/anime/${a.anime.id}">
        <div class="mini-card-cover" style="${poster}">
          ${a.anime.rating ? `<span class="rating-badge">${a.anime.rating}</span>` : ""}
        </div>
        <p class="mini-card-title">${a.anime.anime_name}</p>
      </a>
    `;
  }

  function renderList(container, rows) {
    if (!rows.length) {
      container.innerHTML = `<div class="anime-placeholder">Hozircha bo'sh</div>`;
      return;
    }
    container.innerHTML = `<div class="mini-card-grid">${rows.map(miniCard).join("")}</div>`;
  }

  if (telegramId) {

    fetch(`/api/user/${telegramId}/liked`)
      .then(r => r.json())
      .then(rows => renderList(likedList, Array.isArray(rows) ? rows : []))
      .catch(() => { likedList.innerHTML = `<div class="anime-placeholder">Yuklab bo'lmadi</div>`; });

    fetch(`/api/user/${telegramId}/watched`)
      .then(r => r.json())
      .then(rows => renderList(watchedList, Array.isArray(rows) ? rows : []))
      .catch(() => { watchedList.innerHTML = `<div class="anime-placeholder">Yuklab bo'lmadi</div>`; });

    fetch(`/api/user/${telegramId}/comments`)
      .then(r => r.json())
      .then(rows => {
        if (!Array.isArray(rows) || !rows.length) {
          commentList.innerHTML = `<div class="anime-placeholder">Hozircha izohlar yo'q</div>`;
          return;
        }
        commentList.innerHTML = rows.map(c => `
          <div class="profile-comment">
            <a class="profile-comment-anime" href="/anime/${c.anime.id}">${c.anime.anime_name}</a>
            <p class="profile-comment-text">${c.content}</p>
            <span class="profile-comment-time">${new Date(c.created_at.replace(" ", "T") + "Z").toLocaleString("uz-UZ")}</span>
          </div>
        `).join("");
      })
      .catch(() => { commentList.innerHTML = `<div class="anime-placeholder">Yuklab bo'lmadi</div>`; });

  }

})();
