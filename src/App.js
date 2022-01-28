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
      className="button button-small "
      onClick={(e) => {
        navigator.clipboard.writeText(props.text);
        setShowCopySuccess(true);
      }}
    >
      {showCopySuccess ? "Copied" : "Copy"}
    </button>
  );
};

const YoutubeSearch = ({ artist = "", track = "", fallbackTitle = "" }) => {
  const searchItem =
    artist && track ? `${artist} ${track}` : fallbackTitle || track;
  console.log(`[=] searchItem:`, searchItem);
  return (
    <a
      className="button button-small"
      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
        searchItem
      )}`}
      target="_blank"
    >
      YouTube <i className="fa-solid fa-arrow-up-right-from-square"></i>
    </a>
  );
};

const Verses = ({ verses = [] }) => {
  return (
    <div className="column">
      <>
        <div className="row">
          <Copy text={verses.join("\n\n")} />
        </div>
        <div>
          {verses.map((v, i) => (
            <Verse key={i} verse={v} />
          ))}
        </div>
      </>
    </div>
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
  // formActive = false,
  autoFocus = false,
  onClear = () => {},
}) => {
  const [formActive, setFormActive] = useState(false);
  return (
    <div
      style={{
        backgroundColor: `${formActive ? "#f0f0f0" : "transparent"}`,
      }}
    >
      <form
        id={formId}
        name={formId}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
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
          className={formActive && "activeForm"}
          onFocus={(e) => setFormActive(true)}
          onBlur={(e) => setFormActive(false)}
        >
          {loading ? "Loading..." : "Search"}
        </button>
        <button
          type="reset"
          className={formActive && "activeForm"}
          onFocus={(e) => setFormActive(true)}
          onBlur={(e) => setFormActive(false)}
          onClick={(e) => {
            e.preventDefault();
            onClear();
          }}
          disabled={loading || !query}
        >
          Clear
        </button>
      </form>
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
                onClick={(e) => {
                  setSong(item);
                }}
                className={`link ${song?.hash == item.hash && "highlight"}`}
              >
                {bulletText(item)}
              </li>
            );
          })}
          <LimitButton {...{ limit, setLimit, data: data.tracks }} />
        </>
      )}
      {message && (
        <li className="column">
          <div> {message} </div>
          {linkout && (
            <div>
              <a href={linkout} target="_blank">
                Visit MainlyNorfolk for &quot;<em>{title}</em>&quot;
                <i
                  className="fa-solid fa-arrow-up-right-from-square end-enhancer"
                  style={{ fontSize: "1rem" }}
                ></i>
              </a>
            </div>
          )}
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
          // style={{ marginLeft: 0, paddingLeft: 0 }}
          onClick={(e) => {
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
    <div className="col-center">
      <SearchForm
        {...{
          onSubmit: submit,
          inputHandler,
          query,
          inputName: "Mainly Norfolk",
          onClear: clear,
        }}
        formId="SearchMainlyNorfolk"
        // formActive={formActive}
        // setFormActive={setFormActive}
        autoFocus={true}
      />

      {data?.length > 0 && (
        <div>
          <div>
            {data.slice(0, limit).map(({ href, title, hash }) => {
              return (
                <div className="column column-100">
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
                        className="fa-solid fa-arrow-up-right-from-square"
                        style={{ fontSize: "70%", lineHeight: "100%" }}
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
          </div>
          <div>
            <LimitButton {...{ limit, setLimit, data }} />
          </div>
        </div>
      )}
      {loading && <Spinner />}
    </div>
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
    <button
      className={`invisible`}
      onClick={(e) => {
        submit();
      }}
      style={{ fontWeight: "bolder" }}
    >
      <span className={`${song?.hash == data?.hash && "highlight"}`}>
        {track} - {artist}
      </span>
    </button>
  );
};

const SearchMusixMatch = ({ song, setSong }) => {
  const [query, setQuery] = useState("Anne Briggs Lowlands");
  const [limit, setLimit] = useState(3);
  const [formActive, setFormActive] = useState(false);
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
    <div>
      <SearchForm
        {...{ onSubmit: submit, inputHandler, query }}
        formId="MusixMatch"
        inputName="MusixMatch"
        onClear={clear}
        // formActive={formActive}
      />

      {data?.length > 0 && (
        <div className="container">
          <ul className="container">
            {data.slice(0, limit).map(({ track, artist, href }) => {
              return (
                <>
                  <li className="row">
                    <MusixMatchResult
                      song={song}
                      setSong={setSong}
                      track={track}
                      href={href}
                      artist={artist}
                      hash={data?.hash}
                    />
                  </li>
                </>
              );
            })}
          </ul>
          <LimitButton {...{ limit, setLimit, data }} />
        </div>
      )}
      {loading && <Spinner />}
    </div>
  );
};

const UltimateGuitarSearch = ({ artist, track, searchQuery }) => {
  return (
    <a
      className="button button-small"
      style={{
        // maxWidth: "200px",
        // overflow: "hidden",
        // wordBreak: "break-all",
        textOverflow: "ellipsis",
        // display: "block",
      }}
      target="_blank"
      href={`https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(
        searchQuery ?? (artist && track ? `${artist} ${track}` : track)
      )}`}
    >
      UltimateGuitar
      {/* {searchQuery ?? (artist && track ? `${artist} ${track}` : track || title)}{" "} */}
      <i className="fa-solid fa-arrow-up-right-from-square end-enhancer"></i>
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
    <div className="container">
      <h3>{heading}</h3>
      {source && (
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
      )}
      <UltimateGuitarSearch
        artist={artist}
        track={track}
        searchQuery={
          track && artist ? `${artist} ${track}` : fallbackTitle || track
        }
      />
      <YoutubeSearch {...{ ...song }} />
      <div>{verses && <Verses verses={verses} />};</div>
    </div>
  );
};

const App = () => {
  const [{ hasSong, loading, error }, setStatus] = useState({
    hasSong: false,
    loading: false,
    error: null,
  });
  const [song, _setSong] = useState(EMPTY_SONG);

  const setSong = (song) => {
    _setSong(song);
    setStatus({ hasSong: true, loading: false, error: false });
    localStorage.setItem("latest-song", str(song));
  };

  useEffect(() => {
    if (!song.hash && localStorage.getItem("latest-song")) {
      try {
        _setSong(JSON.parse(localStorage.getItem("latest-song")));
      } catch {}
    }
  }, []);

  return (
    <div className="container">
      <div className="home">
        <header className="row">
          <h1>Music Searcher Thing</h1>
        </header>
        <div className="row">
          <div className="column column-33">
            <div>
              <SearchMainlyNorfolk setSong={setSong} song={song} />
            </div>
            <div>
              <SearchMusixMatch setSong={setSong} song={song} />
            </div>
          </div>
          <div className="column column-67">
            {song.hash && <Song song={song} />}
          </div>
        </div>
        <pre className="row">Results</pre>
        <code
          className="row"
          style={{ overflowY: "scroll", whiteSpace: "normal" }}
        >
          {JSON.stringify({ song })}
        </code>
      </div>
    </div>
  );
};

render(<App />, document.getElementById("root"));
