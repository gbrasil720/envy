declare module 'gradient-string' {
  type Gradient = ((text: string) => string) & {
    multiline: (text: string) => string
  }

  function gradient(
    colors: string[] | { color: string; pos: number }[]
  ): Gradient

  export default gradient
}
