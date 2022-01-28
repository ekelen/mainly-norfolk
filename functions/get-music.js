const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  const { href } = JSON.parse(event.body);
  try {
    const response = await fetch(href + ".json");
    const data = await response.json();
    return { statusCode: 200, body: JSON.stringify({ data }) };
  } catch (error) {
    return {
      statusCode: error.statusCode,
      body: { error: error.message },
    };
  }
};