import ReactDOM from 'react-dom/client';
import App from './components/app/app';

export function renderApp(rootElement: HTMLElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
