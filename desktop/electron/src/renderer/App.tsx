import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import s from './App.module.css';
import '../../assets/globals.css';
import '../../assets/fonts.css';
import * as I18n from './app/I18n/I18n';
import * as Notifications from './app/Notifications/Notifications';
import * as Modals from './app/Modals/Modals';
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from 'react';
import Tooltip from './ui/Tooltip/Tooltip';
import { apiChannel } from '../main/channels';
import ConnectionList from './app/HomeScreen/ConnectionList/ConnectionList';
import logo from './logo.png';
import backIcon from './back.svg';
import './ui/force-show-scrollbars-on-macos';
import SmallButton from './ui/SmallButton/SmallButton';
import SocialIcons from './ui/SocialIcons/SocialIcons';
import A from './ui/A/A';

// Debug
if (process.env.NODE_ENV === "development") {
  window.electron.ipcRenderer.on(apiChannel, (arg) => {
    // console.debug('Received API event:', arg);
  });
}

const links = {
  blogRoot: 'https://dekaf.io/blog',
  blogRootCropped: 'https://dekaf.io/blog?isCropPage=true',
  docs: 'https://dekaf.io/docs',
  support: 'https://dekaf.io/support',
  upgradeIndividual: 'https://www.dekaf.io/pricing?productId=dekaf-desktop&buyerType=individual'
};

function InitialAppScreen() {
  const { notifyError } = Notifications.useContext();
  const [refreshIframeKey, setRefreshIframeKey] = useState(0);

  useEffect(() => {
    window.electron.ipcRenderer.on(apiChannel, (arg) => {
      if (arg.type === "ErrorHappened") {
        notifyError(arg.message);
      }
    });
  }, []);

  return (
    <I18n.DefaultProvider>
      <Notifications.DefaultProvider>
        <Modals.DefaultProvider>
          <div className={s.App}>
            <Tooltip />
            <div className={s.ConnectionList}>
              <div className={s.Logo}>
                <img src={logo} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <strong>Stay Connected</strong>
                  <SocialIcons fill='#fff' />
                </div>
              </div>
              <ConnectionList />
            </div>
            <div className={s.Blog}>
              <div
                style={{
                  padding: '12rem 18rem 8rem 18rem',
                  display: 'flex',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <SmallButton
                  appearance='borderless'
                  onClick={() => setRefreshIframeKey(v => v + 1)}
                  text='Show all updates'
                  svgIcon={backIcon}
                />
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '18rem' }}>
                  <A href={links.docs} target='_blank'>📘 Documentation</A>
                  <A href={links.support} target='_blank'>🛟 Support</A>
                  <A href={links.upgradeIndividual} target='_blank'><strong>⭐️ Upgrade</strong></A>
                </div>
              </div>
              <iframe key={refreshIframeKey} src={links.blogRootCropped} className={s.BlogIframe} />
            </div>
          </div>
        </Modals.DefaultProvider>
      </Notifications.DefaultProvider>
    </I18n.DefaultProvider>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<InitialAppScreen />} />
      </Routes>
    </Router>
  );
}
