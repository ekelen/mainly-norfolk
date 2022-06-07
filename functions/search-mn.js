const fetch = require("node-fetch");
const cheerio = require("cheerio");
const path = require("path");
const _ = require("lodash");

const url = "https://mainlynorfolk.info";

const endpointSearch = "folk/songs/search.php";

const str = (json) => JSON.stringify(json);
const hashIt = (link = {}) =>
  (link.hash = require("crypto")
    .createHash("md5")
    .update(str(link))
    .digest("hex"));

exports.handler = async (event, _context) => {
  const { query = "" } = JSON.parse(event.body);
  try {
    const response = await fetch(path.join(url, endpointSearch), {
      credentials: "omit",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en,fr-FR;q=0.5",
        "Content-Type": "application/x-www-form-urlencoded",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
      },
      referrer: path.join(url, endpointSearch),
      body: `song=${encodeURIComponent(query)}&author=&key=roud&keyval=`,
      method: "POST",
      mode: "cors",
    });
    const data = await response.text();
    const $ = cheerio.load(data);
    const resultsHeading = $("strong")
      .filter(function () {
        return $(this).text().trim() === "Search Results";
      })
      .first();
    const links = [];
    resultsHeading
      .parent("p")
      .next("ul")
      .first()
      .children("li")
      .children("a")
      .each(function (_i, _el) {
        const title = $(this).text().trim();
        const href = path.join(url, $(this).attr("href").slice("../..".length));
        if (title && href) {
          // TODO: Titles that don't fit this pattern

          links.push({
            title,
            href: path.join(url, $(this).attr("href").slice("../..".length)),
          });
        }
        links.forEach(hashIt);
      });
    if (links.length < 1) {
      return {
        statusCode: 404,
        body: str({ error: "No results found." }),
      };
    }
    return { statusCode: 200, body: str({ data: links }) };
  } catch (scrapeMainlyNorfolkError) {
    return {
      statusCode: 500,
      body: str({ error: scrapeMainlyNorfolkError.message }),
    };
  }
};
