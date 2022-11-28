import ReactDOM from 'react-dom';
import App from './components/app/app';

export function renderApp(rootElement: HTMLElement) {
  ReactDOM.render(<App />, rootElement);
}
