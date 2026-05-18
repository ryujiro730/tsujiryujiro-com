import React from 'react'
import { MermaidBlock } from './MermaidBlock'

export function MdxPre({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const child = React.Children.count(children) === 1
    ? (React.Children.toArray(children)[0] as React.ReactElement)
    : null

  if (child?.props?.className === 'language-mermaid') {
    const code = typeof child.props.children === 'string'
      ? child.props.children
      : ''
    return <MermaidBlock chart={code} />
  }

  return <pre {...props}>{children}</pre>
}
