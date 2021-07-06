# WIP
存放暂存内容

raw ：
```ts
import React, { useState } from 'react';
import logo from './logo.svg';
import './App.scss';
import Add from './Add';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Hello Vite + React!</p>
        <p>
          <button onClick={() => setCount(count => count + 1)}>count is: {count}</button>
        </p>
        <p>
          Edit <code>App.tsx</code> and sdddave updates.
        </p>
        <Add />
      </header>
    </div>
  );
}

export default App;
```
react-refresh
`code:'  import RefreshRuntime from "/@react-refresh";  let prevRefreshReg;  let prevRefreshSig;  if (!window.__vite_plugin_react_preamble_installed__) {    throw new Error(      "vite-plugin-react can't detect preamble. Something is wrong. " +      "See https://github.com/vitejs/vite-plugin-react/pull/11#discussion_r430879201"    );  }  if (import.meta.hot) {    prevRefreshReg = window.$RefreshReg$;    prevRefreshSig = window.$RefreshSig$;    window.$RefreshReg$ = (type, id) => {      RefreshRuntime.…</header>\n    </div>;\n}\n\n_s(App, "oDgYfYHkD9Wkv4hrAPCkI/ev3YU=");\n\n_c = App;\nexport default App;\n\nvar _c;\n\n$RefreshReg$(_c, "App");\n  if (import.meta.hot) {\n    window.$RefreshReg$ = prevRefreshReg;\n    window.$RefreshSig$ = prevRefreshSig;\n\n    import.meta.hot.accept();\n    if (!window.__vite_plugin_react_timeout) {\n      window.__vite_plugin_react_timeout = setTimeout(() => {\n        window.__vite_plugin_react_timeout = 0;\n        RefreshRuntime.performReactRefresh();\n      }, 30);\n    }\n  }'`