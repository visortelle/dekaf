import ReactDOM from 'react-dom/client';
import App from './components/app/app';
import { Config } from './components/app/contexts/AppContext';

export function renderApp(rootElement: HTMLElement, config: Config) {
  ReactDOM.createRoot(rootElement).render(<App config={config} />);
}
