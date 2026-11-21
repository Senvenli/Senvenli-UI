/** Where the builder keeps the visitor's preset: the code and the CSS it compiled to. */
export const PRESET_STORAGE_KEY = "ds-preset";

/**
 * The stored preset's format. Bump it when the token names the engine emits change: a stored preset of
 * another format is ignored instead of painting stale variables after a deploy.
 */
export const PRESET_FORMAT = 1;

export type StoredPreset = { v: number; code: string; css: string };

/**
 * The second head script (the first is the library's `themeScript`, which sets data-theme).
 * It puts the stored preset's CSS variables in <head> before the first paint. The theme engine is
 * too large to inline, so the script only replays CSS the builder already compiled and stored.
 * On /create a `?p=` that differs from the stored code cannot be painted yet: the script marks
 * <html data-preset-pending> and the builder's preview stays hidden until React applies the code.
 */
export const presetScriptSource =
  "(function(){try{var d=document,s=null;" +
  `try{s=JSON.parse(window.localStorage.getItem(${JSON.stringify(PRESET_STORAGE_KEY)})||"null")}catch(e){}` +
  `if(s&&s.v!==${PRESET_FORMAT})s=null;` +
  'var p=/^\\/create\\/?$/.test(location.pathname)?new URLSearchParams(location.search).get("p"):null;' +
  'if(p!==null&&(!s||s.code!==p)){d.documentElement.setAttribute("data-preset-pending","");return}' +
  'if(s&&typeof s.css==="string"){var e=d.createElement("style");e.id="theme-vars";e.textContent=s.css;d.head.appendChild(e)}' +
  "}catch(e){}})();";
