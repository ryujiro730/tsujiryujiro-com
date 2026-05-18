import React from 'react'
import { MermaidBlock } from './MermaidBlock'

export function MdxPre({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const childArray = React.Children.toArray(children)

  if (childArray.length === 1) {
    const child = childArray[0]
    if (React.isValidElement(child) && (child.props as Record<string, unknown>)?.className === 'language-mermaid') {
      const code = typeof (child.props as Record<string, unknown>).children === 'string'
        ? (child.props as Record<string, unknown>).children as string
        : ''
      return <MermaidBlock chart={code} />
    }
  }

  return <pre {...props}>{children}</pre>
}
