import type { NextPage } from 'next'
import Head from 'next/head'
import Router from '../components/Router/Router'

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Pulsar UI</title>
        <meta name="description" content="Pulsar UI" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Router />
    </>
  )
}

export default Home
