import type { NextPage } from 'next'
import Head from 'next/head'
import Router from '../components/app/Router/Router'
import Layout from '../components/ui/Layout/Layout'

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Pulsar X-Ray</title>
        <meta name="description" content="Pulsar X-Ray" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Router />
    </>
  )
}

export default Home
