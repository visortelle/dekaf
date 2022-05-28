import type { AppProps } from 'next/app'
import Head from 'next/head'
import { DefaultAppContextProvider, useAppContext } from '../components/AppContext/AppContext';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from 'next/router';
import { useEffect, useCallback } from 'react';


const MyApp = (props: AppProps) => {
  return <>
    <Head>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"></meta>
    </Head>

    <DefaultAppContextProvider>
      <ComponentWithProgressIndicator {...props} />
    </DefaultAppContextProvider>
  </>
}

const taskName = 'page-loading';

const ComponentWithProgressIndicator = ({ Component, pageProps }: AppProps) => {
  const router = useRouter();
  const context = useAppContext();

  const handleRouteChangeStart = useCallback(() => {
    context.startTask(taskName);
  }, []);

  const handleRouteChangeEnd = useCallback(() => {
    context.finishTask(taskName);
  }, []);

  useEffect(() => {
    router.events.on("routeChangeStart", handleRouteChangeStart);
    router.events.on("routeChangeComplete", handleRouteChangeEnd);
    router.events.on("routeChangeError", handleRouteChangeEnd);
    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
      router.events.off("routeChangeComplete", handleRouteChangeEnd);
      router.events.off("routeChangeError", handleRouteChangeEnd);
    };
  }, [router, handleRouteChangeStart, handleRouteChangeEnd]);

  return (
    <Component {...pageProps} />
  );
}

export default MyApp;
