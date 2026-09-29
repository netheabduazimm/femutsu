(function () {

  const animeId = location.pathname.split("/")[2];

  const el = {
    loading: document.getElementById("animeLoading"),
    content: document.getElementById("animeContent"),
    poster: document.getElementById("animePoster"),
    originalName: document.getElementById("animeOriginalName"),
    name: document.getElementById("animeName"),
    badges: document.getElementById("animeBadges"),
    metaGrid: document.getElementById("animeMetaGrid"),
    description: document.getElementById("animeDescription"),
    episodeList: document.getElementById("episodeList"),
    episodeCount: document.getElementById("episodeCount"),
    player: document.getElementById("player"),
    playerEmpty: document.getElementById("playerEmpty"),
    likeBtn: document.getElementById("likeBtn"),
    likeBtnLabel: document.getElementById("likeBtnLabel"),
    commentForm: document.getElementById("commentForm"),
    commentLoginNote: document.getElementById("commentLoginNote"),
    commentInput: document.getElementById("commentInput"),
    commentSubmit: document.getElementById("commentSubmit"),
    commentList: document.getElementById("commentList"),
    commentCount: document.getElementById("commentCount"),
    pageTitle: document.getElementById("pageTitle"),
  };

  const gradients = [
    "linear-gradient(150deg,#ff3d71,#7c5cff)",
    "linear-gradient(150deg,#7c5cff,#2bd9c9)",
    "linear-gradient(150deg,#ff7a5c,#ff3d71)",
    "linear-gradient(150deg,#2bd9c9,#3d7bff)",
  ];

  let currentUser = null;
  let currentEpisode = null;
  let saveTimer = null;

  function getCachedUser() {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function timeAgo(dateStr) {
    const d = new Date(dateStr.replace(" ", "T") + "Z");
    const diff = Math.max(0, (Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "hozirgina";
    if (diff < 3600) return Math.floor(diff / 60) + " daqiqa oldin";
    if (diff < 86400) return Math.floor(diff / 3600) + " soat oldin";
    if (diff < 172800) return "kecha";
    return Math.floor(diff / 86400) + " kun oldin";
  }

  // ---------------- anime info ----------------

  function renderAnime(anime) {

    el.pageTitle.textContent = `${anime.anime_name} — Femutsu`;
    el.originalName.textContent = anime.original_name || "";
    el.name.textContent = anime.anime_name;
    el.description.textContent = anime.description || "";

    if (anime.poster) {
      el.poster.style.background = `center/cover no-repeat url('${anime.poster}')`;
    } else {
      el.poster.style.background = gradients[anime.id % gradients.length];
    }

    const badges = [];
    if (anime.rating) badges.push(`<span class="tag tag-rating">★ ${anime.rating}</span>`);
    if (anime.type) badges.push(`<span class="tag">${anime.type}</span>`);
    if (anime.status) badges.push(`<span class="tag tag-status">${anime.status}</span>`);
    if (anime.age_rating) badges.push(`<span class="tag">${anime.age_rating}</span>`);
    if (anime.age_restriction) badges.push(`<span class="tag tag-age">${anime.age_restriction}</span>`);
    el.badges.innerHTML = badges.join("");

    const meta = [];
    if (anime.episodes) meta.push(["Qismlar", anime.episodes]);
    if (anime.seasons) meta.push(["Mavsumlar", anime.seasons]);
    if (anime.release_date) meta.push(["Chiqarilgan sana", anime.release_date]);
    if (anime.avg_episode_length) meta.push(["O'rtacha davomiylik", `${anime.avg_episode_length} daqiqa`]);
    if (anime.genre && anime.genre.length) meta.push(["Janr", anime.genre.join(", ")]);

    el.metaGrid.innerHTML = meta.map(([label, val]) => `
      <div class="meta-item">
        <span>${label}</span>
        <strong>${val}</strong>
      </div>
    `).join("");

    el.episodeCount.textContent = anime.episodes ? `${anime.episodes} ta qism` : "";

    renderEpisodes(anime.episodes_list || []);
  }

  function renderEpisodes(episodes) {

    if (!episodes.length) {
      el.episodeList.innerHTML = `<p class="no-episodes">Qismlar hali qo'shilmagan</p>`;
      el.playerEmpty.hidden = false;
      return;
    }

    el.episodeList.innerHTML = episodes.map(ep => `
      <button class="episode-btn" data-id="${ep.id}" data-src="/uploads/${ep.video_path}" data-num="${ep.episode_number}">
        ${ep.episode_number}
      </button>
    `).join("");

    el.episodeList.querySelectorAll(".episode-btn").forEach(btn => {
      btn.addEventListener("click", () => selectEpisode(episodes, btn));
    });

    // resume from watch history if logged in, else start at episode 1
    const cached = getCachedUser();
    if (cached && cached.telegram_id) {
      fetch(`/api/user/${cached.telegram_id}/watched`)
        .then(r => r.json())
        .then(list => {
          const record = Array.isArray(list) ? list.find(w => String(w.anime_id) === String(animeId)) : null;
          const targetBtn = record
            ? el.episodeList.querySelector(`.episode-btn[data-id="${record.episode_id}"]`)
            : el.episodeList.querySelector(".episode-btn");
          if (targetBtn) selectEpisode(episodes, targetBtn, record ? record.progress_seconds : 0);
        })
        .catch(() => {
          const first = el.episodeList.querySelector(".episode-btn");
          if (first) selectEpisode(episodes, first);
        });
    } else {
      const first = el.episodeList.querySelector(".episode-btn");
      if (first) selectEpisode(episodes, first);
    }
  }

  function selectEpisode(episodes, btn, resumeSeconds) {

    el.episodeList.querySelectorAll(".episode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentEpisode = {
      id: btn.dataset.id,
      number: btn.dataset.num
    };

    el.player.src = btn.dataset.src;
    el.playerEmpty.hidden = true;

    if (resumeSeconds) {
      const onLoaded = () => {
        el.player.currentTime = resumeSeconds;
        el.player.removeEventListener("loadedmetadata", onLoaded);
      };
      el.player.addEventListener("loadedmetadata", onLoaded);
    }
  }

  function saveProgress(completed) {

    if (!currentUser || !currentEpisode) return;

    fetch(`/api/anime/${animeId}/watch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        episode_id: currentEpisode.id,
        episode_number: currentEpisode.number,
        progress_seconds: Math.floor(el.player.currentTime || 0),
        completed: !!completed
      })
    }).catch(() => {});
  }

  el.player.addEventListener("timeupdate", () => {
    if (!currentUser) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveProgress(false), 8000);
  });
  el.player.addEventListener("pause", () => saveProgress(false));
  el.player.addEventListener("ended", () => saveProgress(true));
  window.addEventListener("beforeunload", () => saveProgress(false));

  // ---------------- like ----------------

  function refreshLikeState() {
    fetch(`/api/anime/${animeId}/like-status`)
      .then(r => r.json())
      .then(data => {
        el.likeBtn.classList.toggle("liked", !!data.liked);
        el.likeBtnLabel.textContent = data.liked ? "Yoqtirilgan" : "Yoqtirish";
      })
      .catch(() => {});
  }

  el.likeBtn.addEventListener("click", () => {
    fetch(`/api/anime/${animeId}/like`, { method: "POST" })
      .then(r => {
        if (r.status === 401) {
          location.href = "/login";
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        el.likeBtn.classList.toggle("liked", !!data.liked);
        el.likeBtnLabel.textContent = data.liked ? "Yoqtirilgan" : "Yoqtirish";
      })
      .catch(() => {});
  });

  // ---------------- comments ----------------

  function commentHTML(c, isReply) {

    const avatar = (c.user && c.user.photo_url) || "/assets/default-avatar.svg";
    const displayName = (c.user && c.user.first_name) || "Foydalanuvchi";
    const canDelete = currentUser && (currentUser.telegram_id === (c.user && c.user.telegram_id));

    return `
      <div class="comment ${isReply ? "comment-reply" : ""}" data-id="${c.id}">
        <img class="comment-avatar" src="${avatar}" onerror="this.src='/assets/default-avatar.svg'">
        <div class="comment-body">
          <div class="comment-head">
            <span class="comment-author">${displayName}</span>
            <span class="comment-time">${timeAgo(c.created_at)}</span>
          </div>
          <p class="comment-text">${escapeHtml(c.content)}</p>
          <div class="comment-actions">
            <button class="vote-btn like" data-comment="${c.id}" data-value="1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 10v11H3V10h4Zm4 11h7.4a2 2 0 0 0 2-1.6l1.4-7A2 2 0 0 0 20 10h-5.5l.8-4a1.5 1.5 0 0 0-2.6-1.3L8 10v11h3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
              <span>${c.likes || ""}</span>
            </button>
            <button class="vote-btn dislike" data-comment="${c.id}" data-value="-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="transform:rotate(180deg)"><path d="M7 10v11H3V10h4Zm4 11h7.4a2 2 0 0 0 2-1.6l1.4-7A2 2 0 0 0 20 10h-5.5l.8-4a1.5 1.5 0 0 0-2.6-1.3L8 10v11h3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
              <span>${c.dislikes || ""}</span>
            </button>
            ${!isReply ? `<button class="reply-toggle" data-comment="${c.id}">Javob berish</button>` : ""}
            ${canDelete ? `<button class="delete-comment" data-comment="${c.id}">O'chirish</button>` : ""}
          </div>
          <div class="reply-form-slot" id="reply-slot-${c.id}"></div>
          ${(c.replies && c.replies.length) ? `<div class="comment-replies">${c.replies.map(r => commentHTML(r, true)).join("")}</div>` : ""}
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function countAll(comments) {
    let n = 0;
    comments.forEach(c => { n += 1 + (c.replies ? countAll(c.replies) : 0); });
    return n;
  }

  function loadComments() {
    fetch(`/api/anime/${animeId}/comments`)
      .then(r => r.json())
      .then(comments => {
        el.commentList.innerHTML = comments.length
          ? comments.map(c => commentHTML(c, false)).join("")
          : `<p class="no-comments">Hali izohlar yo'q. Birinchi bo'ling!</p>`;
        el.commentCount.textContent = countAll(comments) || "";
        bindCommentEvents();
      })
      .catch(() => {
        el.commentList.innerHTML = `<p class="no-comments">Izohlarni yuklab bo'lmadi</p>`;
      });
  }

  function bindCommentEvents() {

    el.commentList.querySelectorAll(".vote-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!currentUser) { location.href = "/login"; return; }
        fetch(`/api/comments/${btn.dataset.comment}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: Number(btn.dataset.value) })
        }).then(() => loadComments()).catch(() => {});
      });
    });

    el.commentList.querySelectorAll(".delete-comment").forEach(btn => {
      btn.addEventListener("click", () => {
        if (!confirm("Izohni o'chirishni tasdiqlaysizmi?")) return;
        fetch(`/api/comments/${btn.dataset.comment}`, { method: "DELETE" })
          .then(() => loadComments()).catch(() => {});
      });
    });

    el.commentList.querySelectorAll(".reply-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const slot = document.getElementById(`reply-slot-${btn.dataset.comment}`);
        if (!currentUser) { location.href = "/login"; return; }
        if (slot.innerHTML) { slot.innerHTML = ""; return; }
        slot.innerHTML = `
          <div class="comment-form reply-form">
            <textarea rows="2" placeholder="Javob yozing..."></textarea>
            <button class="btn-primary reply-submit">Yuborish</button>
          </div>
        `;
        slot.querySelector(".reply-submit").addEventListener("click", () => {
          const text = slot.querySelector("textarea").value.trim();
          if (!text) return;
          fetch(`/api/anime/${animeId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: text, parent_id: btn.dataset.comment })
          }).then(() => loadComments()).catch(() => {});
        });
      });
    });
  }

  el.commentSubmit.addEventListener("click", () => {
    const text = el.commentInput.value.trim();
    if (!text) return;
    fetch(`/api/anime/${animeId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text })
    }).then(res => {
      if (res.status === 401) { location.href = "/login"; return; }
      el.commentInput.value = "";
      loadComments();
    }).catch(() => {});
  });

  // ---------------- init ----------------

  fetch("/api/auth/me")
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      currentUser = data && data.user ? data.user : null;
      el.commentForm.hidden = !currentUser;
      el.commentLoginNote.hidden = !!currentUser;
      loadComments();
    })
    .catch(() => {
      el.commentForm.hidden = true;
      el.commentLoginNote.hidden = false;
      loadComments();
    });

  fetch(`/api/anime/${animeId}`)
    .then(r => {
      if (!r.ok) throw new Error("not found");
      return r.json();
    })
    .then(anime => {
      el.loading.hidden = true;
      el.content.hidden = false;
      renderAnime(anime);
      refreshLikeState();
    })
    .catch(() => {
      el.loading.textContent = "Anime topilmadi";
    });

})();
