/**
 * Example script showing how to add an anime + its episodes to animes.db.
 *
 * This is NOT run automatically. Copy/adjust the values below and run:
 *   node database/seed-example.js
 *
 * Video files themselves are NOT stored in the database — only their path.
 * Put the actual video files on disk at:
 *   uploads/anime/{anime_id}/whatever-file-name.mp4
 * and reference them here as "anime/{anime_id}/whatever-file-name.mp4"
 * (the server serves everything under /uploads/... statically, so that
 * episode ends up reachable at /uploads/anime/{anime_id}/whatever-file-name.mp4).
 */

const db = require("./anime");

db.run(
  `INSERT INTO animes
    (anime_name, original_name, description, poster, rating, type, genre,
     episodes, seasons, status, release_date, age_rating, age_restriction, avg_episode_length)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    "Qora mash'al",          // anime_name (display name, e.g. Uzbek/Russian title)
    "Black Torch",           // original_name
    "Sinovdan o'tgan yosh jangchi haqidagi hikoya.", // description
    null,                    // poster (path/url to a poster image, or null)
    8.9,                     // rating
    "TV",                    // type: TV / Movie / ONA / OVA / Special
    "Ekshn,Fantastika",      // genre (comma separated)
    12,                      // episodes (total count)
    1,                       // seasons
    "ongoing",               // status: ongoing / completed / announced
    "2026",                  // release_date
    "PG-13",                 // age_rating (content rating, e.g. PG-13)
    "16+",                   // age_restriction
    24                       // avg_episode_length (minutes)
  ],
  function (err) {
    if (err) {
      console.error("Failed to insert anime:", err);
      process.exit(1);
    }

    const animeId = this.lastID;
    console.log(`Inserted anime #${animeId}. Now add matching episode rows, e.g.:`);
    console.log(
      `  db.run("INSERT INTO episodes (anime_id, season, episode_number, title, video_path, duration) VALUES (?,?,?,?,?,?)",`
    );
    console.log(
      `    [${animeId}, 1, 1, "1-qism", "anime/${animeId}/e01.mp4", 1440]);`
    );
    console.log(`Don't forget to place the actual file at: uploads/anime/${animeId}/e01.mp4`);
    process.exit(0);
  }
);
