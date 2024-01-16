export default function $ (base: string|URL|Path, ...fragments: string[]): Path {
  return new Path(base, ...fragments)
}

$.file = function getFile (base: string|URL|Path, ...fragments: string[]) {
  return $(base, ...fragments).as(File)
}

$.directory = function getFile (base: string|URL|Path, ...fragments: string[]) {
  return $(base, ...fragments).as(Directory)
}

$.tmpDir = function getTmpDir (prefix = 'file-'): Path {
  return $(mkdtempSync($(tmpdir(), prefix).path))
}
