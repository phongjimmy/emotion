// @flow
import { parseCSS } from './parser'
import { hashArray } from './hash'

function extractNameFromProperty (str: string) {
  let regex = /name\s*:\s*([A-Za-z0-9\-_]+)\s*/gm
  let match = regex.exec(str)
  if (match) {
    return match[1]
  }
}

function getName (
  extracted?: string,
  identifierName?: string,
  prefix: string
): string {
  const parts = []
  parts.push(prefix)
  if (extracted) {
    parts.push(extracted)
  } else if (identifierName) {
    parts.push(identifierName)
  }
  return parts.join('-')
}

function createSrc (
  strs: string[],
  name: string,
  hash: string
): { src: string, dynamicValueCount: number } {
  let dynamicValueCount = 0
  const src = strs
    .reduce((arr, str, i) => {
      arr.push(str)
      if (i !== strs.length - 1) {
        dynamicValueCount++
        arr.push(`xxx${i}xxx`)
      }
      return arr
    }, [])
    .join('')
    .trim()
  return { src, dynamicValueCount }
}

export function inline (
  quasi: any,
  identifierName?: string,
  prefix: string,
  inlineMode: boolean
): {
  isStaticBlock: boolean,
  styles: { [string]: any }
} {
  let strs = quasi.quasis.map(x => x.value.cooked)
  let hash = hashArray([...strs]) // todo - add current filename?
  let name = getName(
    extractNameFromProperty(strs.join('xxx')),
    identifierName,
    prefix
  )
  let { src, dynamicValueCount } = createSrc(strs, name, hash)
  let {
    styles,
    isStaticBlock
  } = parseCSS(src)

  console.log('styles', JSON.stringify(styles, null, 2))
  console.log('isStaticBlock', isStaticBlock)

  return {
    hash,
    name,
    isStaticBlock,
    styles
  }
}

export function keyframes (
  quasi: any,
  identifierName?: string,
  prefix: string
): {
  hash: string,
  name: string,
  rules: string[],
  hasInterpolation: boolean
} {
  const strs = quasi.quasis.map(x => x.value.cooked)
  const hash = hashArray([...strs])
  const name = getName(
    extractNameFromProperty(strs.join('xxx')),
    identifierName,
    prefix
  )
  const { src, dynamicValueCount } = createSrc(strs, name, hash)
  let { rules, hasVar, hasOtherMatch } = parseCSS(`{ ${src} }`, {
    nested: false,
    inlineMode: true,
    dynamicValueCount,
    name,
    hash
  })
  return { hash, name, rules, hasInterpolation: hasVar || hasOtherMatch }
}

export function fontFace (
  quasi: any
): { rules: string[], hasInterpolation: boolean } {
  let strs = quasi.quasis.map(x => x.value.cooked)
  const { src, dynamicValueCount } = createSrc(strs, 'name', 'hash')
  let { rules, hasVar, hasOtherMatch } = parseCSS(`@font-face {${src}}`, {
    dynamicValueCount: dynamicValueCount,
    inlineMode: true,
    name: 'name',
    hash: 'hash'
  })
  return { rules, hasInterpolation: hasVar || hasOtherMatch }
}

export function injectGlobal (
  quasi: any
): { rules: string[], hasInterpolation: boolean } {
  let strs = quasi.quasis.map(x => x.value.cooked)
  const { src, dynamicValueCount } = createSrc(strs, 'name', 'hash')
  let { rules, hasVar, hasOtherMatch } = parseCSS(src, {
    dynamicValueCount: dynamicValueCount,
    inlineMode: true,
    name: 'name',
    hash: 'hash'
  })
  return { rules, hasInterpolation: hasVar || hasOtherMatch }
}
