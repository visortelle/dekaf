import dynamic from 'next/dynamic'
import React from 'react'

const NoSsr = (props: { children: React.ReactNode }) => (
  <>{props.children}</>
)

export default dynamic(() => Promise.resolve(NoSsr), {
  ssr: false
})
