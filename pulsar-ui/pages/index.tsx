import type { NextPage } from 'next'
import Head from 'next/head'
import HomePage from '../components/HomePage/HomePage'

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Pulsar UI</title>
        <meta name="description" content="Pulsar UI" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <HomePage />
    </>
  )
}

export default Home
