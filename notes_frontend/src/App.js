import React from 'react';
import './App.css';
import './theme.css';
import NotesPage from './pages/NotesPage';

// PUBLIC_INTERFACE
function App() {
  /** Root app shell: navbar + notes page. */
  return (
    <div className="App">
      <nav className="navbar" role="navigation" aria-label="Top navigation">
        <div className="navbar-inner">
          <div className="brand">
            <div className="brand-badge">N</div>
            <div>Notes</div>
          </div>
          <div className="row">
            <a className="btn btn-secondary" href="https://react.dev" target="_blank" rel="noreferrer">Help</a>
          </div>
        </div>
      </nav>
      <NotesPage />
    </div>
  );
}

export default App;
