const fetch = require("node-fetch");
const cheerio = require("cheerio");
const path = require("path");
const _ = require("lodash");

const url = "https://www.musixmatch.com";

const str = (json) => JSON.stringify(json);
const hashIt = (link = {}) =>
  (link.hash = require("crypto")
    .createHash("md5")
    .update(str(link))
    .digest("hex"));

/*
 * Scrape lyrics from MusixMatch results
 */

const getLyricsFromPage = async (uri = "") => {
  if (!uri) throw new Error("No url provided");
  const source = path.join(url, uri);
  let [artist, track] = source
    .slice("https://www.musixmatch.com/lyrics".length)
    .split("/");
  const response = await fetch(source, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Accept-Language": "en,fr-FR;q=0.5",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
    },
    referrer: source,
    method: "GET",
    mode: "cors",
  });
  const data = await response.text();
  const $ = cheerio.load(data);
  artist = $(".mxm-track-title__artist").text();
  track = $(".mxm-track-title__track").text();
  track = track.replace(/^Lyrics/g, "");
  let place = [];
  place = $(".lyrics__content__ok,.lyrics__content__error");
  let verses = [];
  place.each(function (_i, _el) {
    verses.push({
      text: $(this).text(),
    });
  });
  verses = _.compact(verses.map((l) => `${l.text}`));
  if (verses.length < 1) {
    throw new Error("No lyrics found! Sorry. ☹️");
  }
  verses = verses.join("\n");
  verses = verses.split("\n\n");
  const result = { artist, track, verses, source };
  result.hash = hashIt({ artist, href: source, track });
  return result;
};

exports.handler = async (event, _context) => {
  const { uri } = JSON.parse(event.body);
  try {
    const response = await getLyricsFromPage(uri);
    return {
      statusCode: 200,
      body: str({ data: response ?? {} }),
    };
  } catch (scrapeMusixMatchError) {
    console.log(`[=] scrapeMusixMatchError:`, scrapeMusixMatchError);
    return {
      statusCode: scrapeMusixMatchError.status ?? 500,
      body: str({ error: scrapeMusixMatchError.message }),
    };
  }
};
