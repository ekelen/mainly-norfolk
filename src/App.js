import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { render } from "react-dom";
import _ from "lodash";

if (module.hot) {
  module.hot.accept();
}

const str = (val) => JSON.stringify(val);

const EMPTY_SONG = {
  verses: null,
  artist: "",
  track: "",
  hash: "",
  title: "",
  songAuthor: "",
  songTitle: "",
  child: "",
  source: "",
  fallbackTitle: "",
};

const Header = () => (
  <header
    className="flex-row width-100 align-center space-vertical"
    style={{ justifyContent: "space-between", paddingRight: "1rem" }}
  >
    <h1 className="align-center">
      <i className="fa-solid fa-guitar fa-2x"></i>Mainly Norfolk Decolumner
    </h1>
    <h6>
      Search and copy lyrics from{" "}
      <a target="_blank" href="https://mainlynorfolk.info">
        mainlynorfolk.info
        <i className="fa-solid fa-xs fa-arrow-up-right-from-square end-enhancer"></i>
      </a>
    </h6>
  </header>
);

const Spinner = () => (
  <div style={{ textAlign: "center" }}>
    <i className="fa-solid fa-spinner fa-spin-pulse"></i>
  </div>
);

const Line = (props) => {
  return <p>{props.children}</p>;
};

const Verse = (props = { verse: "" }) => {
  return (
    <div>
      {props.verse.split("\n").map((line, i) => (
        <Line key={i}>{line}</Line>
      ))}
      <Line>&nbsp;</Line>
    </div>
  );
};

const Copy = (props = { text: "" }) => {
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  useEffect(() => {
    let timer;
    if (showCopySuccess) {
      timer = setTimeout(() => setShowCopySuccess(false), 3000);
    }
    return () => clearTimeout(timer);
  });
  return (
    <button
      className="button button-small"
      style={{ marginRight: "0.5rem" }}
      onClick={(_e) => {
        navigator.clipboard.writeText(props.text);
        setShowCopySuccess(true);
      }}
    >
      {showCopySuccess ? (
        <>
          <i className="fa-solid fa-check start-enhancer"></i>Copied
        </>
      ) : (
        <>
          <i className="fa-solid fa-copy start-enhancer"></i>Copy
        </>
      )}
    </button>
  );
};

const Verses = ({ verses = [] }) => {
  return _.compact(verses).length > 0 ? (
    <>
      <div>
        {verses.map((v, i) => (
          <Verse key={i} verse={v} />
        ))}
      </div>
    </>
  ) : (
    <p>No lyrics found! ☹️</p>
  );
};

const useSearchForm = ({
  endpoint = "",
  options = {},
  localStorageKey = "",
}) => {
  const [{ data, status, statusText, message, loading, linkout }, setResults] =
    useState(() => {
      let localData = null;
      try {
        localData = JSON.parse(localStorage.get(localStorageKey));
      } catch (e) {}
      return {
        data: localData,
        status: null,
        statusText: "",
        message: "",
        loading: false,
        linkout: "",
      };
    });

  const clear = () => {
    localStorage.removeItem(localStorageKey);
    setResults(() => ({
      data: null,
      status: null,
      statusText: "",
      message: "",
      loading: false,
      linkout: "",
    }));
  };

  const submit = () => {
    setResults((results) => ({
      ...results,
      loading: true,
      message: "",
      status: null,
      statusText: "",
      linkout: "",
    }));
    return fetch(endpoint, options)
      .then((response) => {
        setResults((results) => ({
          ...results,
          status: response.status,
          statusText: response.statusText,
          data: null,
        }));
        return response.json();
      })
      .then(({ data, error, linkout }) => {
        setResults((results) =>
          error
            ? {
                ...results,
                data: null,
                message: error,
                loading: false,
                linkout,
              }
            : {
                ...results,
                data: data,
                message: "",
                loading: false,
              }
        );
        if (localStorageKey) {
          try {
            if (data) localStorage.setItem(localStorageKey, str(data));
            else {
              localStorage.removeItem(localStorageKey);
            }
          } catch (e) {
            console.error(
              "Could not set local storage item for ",
              localStorageKey,
              error.message
            );
          }
        }
      })
      .catch((e) => {
        setResults(() => ({
          message: e.message,
          loading: false,
          data: null,
          linkout: e.linkout,
        }));
      });
  };

  return [
    { data, status, statusText, message, loading, linkout },
    submit,
    clear,
  ];
};

const SearchForm = ({
  onSubmit = () => {},
  query = "",
  inputHandler = () => {},
  loading = false,
  formId = "",
  inputName = "",
  autoFocus = false,
  onClear = () => {},
  message = "",
}) => {
  const [formActive, setFormActive] = useState(false);
  return (
    <div className={`card section ${formActive ? "activeForm" : undefined}`}>
      <form
        id={formId}
        name={formId}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="card section"
      >
        <label htmlFor={`${formId}-field`}>{inputName}</label>
        <input
          autoFocus={autoFocus}
          onFocus={() => {
            setFormActive(true);
          }}
          onBlur={() => {
            setFormActive(false);
          }}
          type="text"
          id={`${formId}-field`}
          name={`${formId}-field`}
          value={query}
          onChange={(e) => {
            inputHandler(e.target.value);
          }}
        />
        <button
          type="submit"
          className={formActive ? "activeForm" : undefined}
          onFocus={(_e) => setFormActive(true)}
          onBlur={(_e) => setFormActive(false)}
          style={{ marginRight: "0.5rem" }}
          disabled={query.length < 1 || loading}
        >
          {loading ? "Loading..." : "Search"}
        </button>
        <button
          type="reset"
          className={`${formActive ? "activeForm" : undefined} button-outline`}
          onFocus={(_e) => setFormActive(true)}
          onBlur={(_e) => setFormActive(false)}
          onClick={(e) => {
            e.preventDefault();
            inputHandler(() => "");
            onClear();
          }}
          disabled={loading || !query}
        >
          Clear
        </button>
      </form>
      {message && <div>Error: {message}</div>}
    </div>
  );
};

/**
 *
 * @desc Will list the results of a Mainly Norfolk `.json` formatted file
 */
const ListMainlyNorfolk = ({ href = "", title = "", song = {}, setSong }) => {
  const [limit, setLimit] = useState(3);
  const [{ data, loading, message, linkout }, submit, clear] = useSearchForm({
    endpoint: "/.netlify/functions/get-mn-music-from-json",
    options: { method: "POST", body: JSON.stringify({ href }) },
  });
  useEffect(() => {
    if (!data && !loading && !message) {
      submit();
    }
  }, [loading, message, data]);
  const bulletText = (item = {}) => {
    const { track, artist, fallbackTitle } = item;
    return track && artist ? `${artist} – ${track}` : fallbackTitle || track;
  };
  return (
    <ul className="container">
      {data && data.tracks && data.tracks.length > 0 && (
        <>
          {data.tracks.slice(0, limit).map((item) => {
            return (
              <li
                onClick={(_e) => {
                  setSong(item);
                }}
                className={`link ${song?.hash == item.hash && "highlight"}`}
                key={`${item.hash}`}
              >
                {bulletText(item)}
              </li>
            );
          })}
          <LimitButton {...{ limit, setLimit, data: data.tracks }} />
        </>
      )}
      {message && (
        <li>
          {message}
          {/* {linkout && (
            <a href={linkout} target="_blank">
              {"  "} Visit MainlyNorfolk for &quot;<em>{title}</em>&quot;
              <i
                className="fa-solid fa-arrow-up-right-from-square end-enhancer"
                style={{ fontSize: "1rem" }}
              ></i>
            </a>
          )} */}
        </li>
      )}
      {loading && <Spinner />}
    </ul>
  );
};

const LimitButton = ({ data = [], limit, setLimit, defaultLimit = 3 }) => {
  const listMax = data.length + 1;
  return (
    <>
      {data?.length > defaultLimit && (
        <button
          className="button-small button-outline"
          onClick={(_e) => {
            setLimit(listMax > limit ? listMax : 3);
          }}
        >
          <i
            className={
              "start-enhancer " +
              (listMax > limit
                ? "fa-solid fa-square-caret-down"
                : "fa-solid fa-square-caret-up")
            }
          ></i>
          {listMax > limit ? "See all" : "Show less"}
        </button>
      )}
    </>
  );
};

const SearchMainlyNorfolk = ({ setSong = () => {}, song = {} }) => {
  const [query, setQuery] = useState("The King");
  const [limit, setLimit] = useState(3);
  const [
    { data, status, statusText, message, loading, linkout },
    submit,
    clear,
  ] = useSearchForm({
    localStorageKey: "SEARCH_MN_RESULTS",
    endpoint: "/.netlify/functions/search-mn",
    options: {
      method: "POST",
      body: JSON.stringify({
        query,
      }),
    },
  });

  const inputHandler = useMemo(
    () => _.debounce((val) => setQuery(val), 10),
    []
  );

  return (
    <>
      <SearchForm
        {...{
          onSubmit: submit,
          inputHandler,
          query,
          inputName: "Mainly Norfolk",
          onClear: clear,
          message,
        }}
        formId="SearchMainlyNorfolk"
        autoFocus={true}
      />
      {loading && <Spinner />}
      {data?.length > 0 && (
        <div className="card section">
          {data.slice(0, limit).map(({ href, title, hash }) => {
            return (
              <div className="card section">
                <h4>
                  <a
                    href={href}
                    target="_blank"
                    style={
                      {
                        // display: "block inline-flex",
                        // alignItems: "center",
                        // verticalAlign: "center",
                      }
                    }
                  >
                    {title}&nbsp;&nbsp;
                    <i
                      className="fa-solid fa-arrow-up-right-from-square fa-xs"
                      // style={{ fontSize: "70%", lineHeight: "100%" }}
                    ></i>
                  </a>
                </h4>
                <ListMainlyNorfolk
                  href={href}
                  title={title}
                  hash={hash}
                  {...{ setSong, song }}
                />
              </div>
            );
          })}
          <div className="card section">
            <LimitButton {...{ limit, setLimit, data }} />
          </div>
        </div>
      )}
    </>
  );
};

const MusixMatchResult = ({ song, setSong, href, artist, track, hash }) => {
  const [{ data, loading, message }, submit] = useSearchForm({
    endpoint: "/.netlify/functions/get-mm-lyrics",
    options: { method: "POST", body: JSON.stringify({ uri: href }) },
    localStorageKey: hash ? `MUSIXMATCH_RESULT_${hash}` : undefined,
  });

  useEffect(() => {
    if (data?.hash && song?.hash && song?.hash !== data?.hash) {
      setSong(data);
    }
  }, [data]);

  return (
    <span
      className={`${song && song?.hash == data?.hash && "highlight"} link ${
        loading && "disabled"
      }`}
      onClick={(_e) => {
        if (song && song.hash == hash) return;
        submit();
      }}
    >
      {track} - {artist}
    </span>
  );
};

const SearchMusixMatch = ({ song, setSong }) => {
  const [query, setQuery] = useState("Anne Briggs");
  const [limit, setLimit] = useState(3);
  const [{ data, status, statusText, message, loading }, submit, clear] =
    useSearchForm({
      endpoint: "/.netlify/functions/get-mm-list",
      localStorageKey: `MUSIXMATCH_RESULTS`,
      options: {
        method: "POST",
        body: JSON.stringify({
          query,
        }),
      },
    });
  const inputHandler = useMemo(
    () => _.debounce((val) => setQuery(val), 10),
    []
  );

  return (
    <>
      <SearchForm
        {...{ onSubmit: submit, inputHandler, query, message }}
        formId="MusixMatch"
        inputName="MusixMatch"
        onClear={clear}
      />

      {data?.length > 0 && (
        <>
          <ul className="card section">
            {data.slice(0, limit).map(({ track, artist, href }) => {
              return (
                <li className="card section">
                  <MusixMatchResult
                    song={song}
                    setSong={setSong}
                    track={track}
                    href={href}
                    artist={artist}
                    hash={data?.hash}
                  />
                </li>
              );
            })}
          </ul>
          <LimitButton {...{ limit, setLimit, data }} />
        </>
      )}
      {loading && <Spinner />}
    </>
  );
};

const UltimateGuitarSearch = ({ artist, track, searchQuery }) => {
  return (
    <a
      className="button button-small button-outline"
      target="_blank"
      href={`https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(
        searchQuery ?? (artist && track ? `${artist} ${track}` : track)
      )}`}
    >
      <i className="fa-solid fa-search start-enhancer"></i>
      UltimateGuitar
      {/* <i className="fa-solid fa-arrow-up-right-from-square end-enhancer"></i> */}
    </a>
  );
};

const YoutubeSearch = ({ artist = "", track = "", fallbackTitle = "" }) => {
  const searchItem =
    artist && track ? `${artist} ${track}` : fallbackTitle || track;
  return (
    <a
      className="button button-small button-outline"
      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
        searchItem
      )}`}
      target="_blank"
      role="button"
      style={{ marginLeft: "0.5rem" }}
    >
      <i className="fa-solid fa-search start-enhancer"></i>YouTube
    </a>
  );
};

const Song = ({ song = EMPTY_SONG }) => {
  let {
    verses,
    artist,
    track,
    hash,
    title,
    child,
    songAuthor,
    source,
    fallbackTitle,
  } = song;
  const heading =
    track && artist ? `${artist} – ${track}` : fallbackTitle || track;
  return (
    <div className="card outer">
      <div className="card inner">
        <h3 className="card section">{heading}</h3>
        {source && (
          <div className="card section">
            <a
              href={source}
              target="_blank"
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "small",
                lineHeight: 1.7,
                marginBottom: "1rem",
              }}
            >
              <div>{source}</div>
              <i
                className="fa-solid fa-arrow-up-right-from-square end-enhancer"
                style={{
                  fontSize: "0.8rem",
                  height: "0.8rem",
                  lineHeight: "0.8rem",
                }}
              ></i>
            </a>
          </div>
        )}
        <Copy text={verses.join("\n\n")} />
        <UltimateGuitarSearch
          artist={artist}
          track={track}
          searchQuery={
            track && artist ? `${artist} ${track}` : fallbackTitle || track
          }
        />
        <YoutubeSearch {...{ ...song }} />
        <div className="card section">
          <Verses verses={verses} />
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [{ hasSong }, setStatus] = useState({
    hasSong: false,
  });
  const [song, _setSong] = useState(EMPTY_SONG);
  const myRef = useRef(null);

  const executeScroll = () => myRef.current.scrollIntoView();

  const setSong = (song) => {
    _setSong(song);
    executeScroll();
    setStatus({ hasSong: true, loading: false, error: false });
    if (!song.verses?.length) {
      return;
    }
    localStorage.setItem("latest-song", str(song));
  };

  useEffect(() => {
    if (!hasSong && localStorage.getItem("latest-song")) {
      try {
        _setSong(JSON.parse(localStorage.getItem("latest-song")));
      } catch {}
    }
  }, []);

  return (
    <div className="container">
      <div className="home" ref={myRef}>
        <Header />
        <div
          className="flex-row width-100"
          style={{
            alignItems: "flex-start",
            marginRight: "1rem",
            // flexBasis: "15%",
            // flexGrow: 10,
          }}
        >
          <div
            style={{
              flexBasis: "300px",
              flexGrow: 1,
              flexShrink: 0,
            }}
          >
            <div className="card outer">
              <div className="card inner">
                <SearchMainlyNorfolk setSong={setSong} song={song} />
              </div>
            </div>
            <div className="card outer">
              <div className="card inner">
                <SearchMusixMatch setSong={setSong} song={song} />
              </div>
            </div>
          </div>
          {song.hash && (
            <div
              className="flex-column"
              style={{
                flexBasis: "70%",
                flexShrink: 1,
                flexGrow: 1,
              }}
            >
              {song.hash && <Song song={song} />}
            </div>
          )}
        </div>
        <h2>Debugger</h2>
        <pre>{JSON.stringify({ song }, null, 2)}</pre>
      </div>
    </div>
  );
};

render(<App />, document.getElementById("root"));
