import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { registerFlightTools } from './webmcp';
const unregister = registerFlightTools();
if(import.meta.hot)import.meta.hot.dispose(unregister);
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
