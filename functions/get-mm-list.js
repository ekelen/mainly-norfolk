const fetch = require("node-fetch");
const cheerio = require("cheerio");
const path = require("path");

const url = "https://www.musixmatch.com";

const str = (json) => JSON.stringify(json);
const hashIt = (link = {}) =>
  (link.hash = require("crypto")
    .createHash("md5")
    .update(str(link))
    .digest("hex"));

const getTracks = async (query = "") => {
  if (!query) throw new Error("No url provided");
  const response = await fetch(
    `${url}/search/${encodeURIComponent(query)}/tracks`,
    {
      credentials: "include",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:97.0) Gecko/20100101 Firefox/97.0",
        Accept: "application/json",
        "Accept-Language": "en,fr-FR;q=0.5",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
      referrer: `https://www.musixmatch.com/search/${encodeURIComponent(
        query
      )}/tracks`,
      method: "GET",
      mode: "cors",
    }
  );
  const data = await response.text();
  const $ = cheerio.load(data);
  let trackElements = [];
  trackElements = $(".track-card").has("a.title").has("a.artist");
  trackElements = trackElements.not(function () {
    return $(this).html().includes("Add lyrics");
  });
  const links = [];
  trackElements.each(function (_i, _el) {
    const t = $(this);
    const href = t.find($("a.title")).first().attr("href");
    const artist = t.find($("a.artist")).first().text();
    const title = t.find("a.title").first().text();

    try {
      links.push({
        track: title,
        artist,
        href,
      });
    } catch (parseResultLinksError) {
      console.error(`parseResultLinksError`, parseResultLinksError);
    }
  });
  const goodLinks = links.filter((l) => !!l.href);
  goodLinks.forEach((l) =>
    hashIt({ artist: l.artist, href: l.href, track: l.track })
  );
  return goodLinks;
};

exports.handler = async (event, _context) => {
  const { query = "" } = JSON.parse(event.body);
  try {
    const response = await getTracks(query);
    return {
      statusCode: 200,
      body: str({ data: response ?? [] }),
    };
  } catch (error) {
    return {
      statusCode: error.status ?? 500,
      body: str({ error: error.message }),
    };
  }
};
