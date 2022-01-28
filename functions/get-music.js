const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  console.log(`[=] event:`, event);
  console.log(`[=] context:`, context);
  const { href } = JSON.parse(event.body);
  console.log(`[=] href:`, href);
  try {
    const response = await fetch(href + ".json");
    const data = await response.json();
    return { statusCode: 200, body: JSON.stringify({ data }) };
  } catch (error) {
    console.log(`[=] error:`, error);
    return {
      statusCode: 500,
      body: { error: error.message },
    };
  }
};
