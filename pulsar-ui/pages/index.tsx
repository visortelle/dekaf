import type { NextPage } from 'next'
import Head from 'next/head'
import Router from '../components/app/Router/Router'

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Teal Tool for Apache Pulsar</title>
        <meta name="description" content="Pulsar X-Ray" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Router />
    </>
  )
}

export default Home
