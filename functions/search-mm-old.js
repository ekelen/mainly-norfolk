const fetch = require("node-fetch");

/**
 *
 * Don't use this;
 * MusixMatch API only returns 30% of lyrics text for free plan
 */
const getLyrics = async (searchData) => {
  const { track } = searchData.message.body?.track_list[0] ?? {};
  const trackId = track.track_id;
  if (!trackId) throw new Error("No lyrics found for search.");
  const url = new URL(`https://api.musixmatch.com/ws/1.1/track.lyrics.get`);
  const params = { track_id: trackId, apikey: process.env.MM_KEY };

  url.search = new URLSearchParams(params);

  const response = await fetch(url, { method: "GET" });
  const json = await response.json();
  const {
    message: {
      body: {
        lyrics: { lyrics_body },
      },
    },
  } = json;
  return {
    statusCode: 200,
    body: { data: lyrics_body },
  };
};

exports.handler = async (event, _context) => {
  const { q_track } = JSON.parse(event.body);
  if (!q_track)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Track search not provided" }),
    };
  const url = new URL(`https://api.musixmatch.com/ws/1.1/track.search`);
  const params = {
    apikey: process.env.MM_KEY,
    q_track,
    s_track_rating: "desc",
    f_has_lyrics: 1,
    page_size: 10,
  };
  url.search = new URLSearchParams(params);
  try {
    const response = await fetch(url);
    const data = await response.json();
    const lyricsResult = await getLyrics(data);
    return {
      statusCode: lyricsResult.statusCode,
      body: JSON.stringify(lyricsResult.body),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
