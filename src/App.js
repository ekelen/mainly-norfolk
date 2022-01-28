import { useCallback, useRef, useState } from "react";
import { render } from "react-dom";

if (module.hot) {
  module.hot.accept();
}

const Verse = (props) => {
  return <div>{props.children}</div>;
};
const Text = (props) => {
  return (
    <div>
      <h1>{props.heading}</h1>
      {props.verses.map((v, i) => (
        <Verse key={i}>{v}</Verse>
      ))}
    </div>
  );
};

const App = () => {
  const [stuff, setStuff] = useState([]);

  const mnhref = useRef("");

  const getStuff = (e) => {
    e.preventDefault();
    fetch("/.netlify/functions/get-music", {
      method: "POST",
      body: JSON.stringify({
        href: mnhref.current.value,
      }),
    })
      .then((response) => {
        console.log(`[=] response:`, response);
        document.querySelector(
          ".message"
        ).innerText = `Response: ${response.status} — ${response.statusText}`;

        return response.json();
      })
      .then((json) => {
        setStuff(json.data);
      });
  };

  return (
    <div>
      <h1>Songs!</h1>
      <form id="mnform" name="mnform" onSubmit={(e) => getStuff(e)}>
        <label htmlFor="mnhref">None</label>
        <input
          ref={mnhref}
          type="text"
          id="mnhref"
          name="mnhref"
          placeholder="https://mainlynorfolk.info/lloyd/songs/thecuckoo.html"
          defaultValue={"https://mainlynorfolk.info/lloyd/songs/thecuckoo.html"}
        />
        <button type="submit">Submit</button>
      </form>
      {stuff
        .filter((v) => v.heading)
        .map((v, i) => (
          <Text key={i} heading={v.heading} verses={v.verses} />
        ))}
    </div>
  );
};

render(<App />, document.getElementById("root"));
