const fetch = require("node-fetch");
const _ = require("lodash");

const str = (json) => JSON.stringify(json);
const hashIt = (link = {}) =>
  (link.hash = require("crypto")
    .createHash("md5")
    .update(str(link))
    .digest("hex"));

exports.handler = async (event, _context) => {
  const { href } = JSON.parse(event.body);
  try {
    if (!href) {
      throw new Error("No url provided.");
    }
    const response = await fetch(href + ".json");
    if (response.status !== 200) {
      return {
        statusCode: response.status,
        body: str({ error: "Can't get song data remotely.", linkout: href }),
      };
    }

    const data = await response.json();

    const [header, ...items] = data;
    const { title, author, child } = header;
    const titles = (title || "").split(" / ").map(_.trim);
    const tracks = items.map((item) => {
      const singReplacee = /\b(sing|sings|sang)\b/g;
      const singSplitter = /\s(sing|sings|sang)\s/g;
      let track = "";
      let artist = "";
      let fallbackTitle = "";
      let splitHeading = _.compact(
        item.heading
          .split(singSplitter)
          .map((v) => v.replace(singReplacee, ""))
          .map(_.trim)
      );

      if (splitHeading.length === 2) {
        [artist, track] = splitHeading;
      }
      if (!artist) {
        fallbackTitle = item.heading;
      }

      const { verses } = item;

      const result = {
        artist,
        track,
        verses,
        fallbackTitle,
        songTitle: title,
        songAuthor: author,
        source: href + ".json",
      };
      result.hash = hashIt(result);
      return result;
    });

    return {
      statusCode: 200,
      body: str({
        data: { tracks, title, titles, child, author },
      }),
    };
  } catch (getMusicJsonError) {
    console.log(`[=] getMusicJsonError:`, getMusicJsonError);
    return {
      statusCode: 500,
      body: str({ error: getMusicJsonError.message }),
    };
  }
};
