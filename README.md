# vsix-utils

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![jsr version][jsr-version-src]][jsr-version-href]

utilities for working with vsix files

## 📦 Installation

```bash
npm install vsix-utils
```

## 🚀 Usage

```ts
import { readVsix, writeVsix } from "vsix-utils";

const success = await writeVsix({
  packagePath: "path/to/vsix",
  force: true, // will overwrite the file if it exists
  epoch: 1000000, // by using epoch it will always generate the same vsix file, if the files hasn't changed.
  files: [
    {
      type: "local",
      localPath: "path/to/file.txt",
      path: "file.txt"
    },
    {
      type: "in-memory",
      contents: "file contents", // or use a buffer
      path: "file.txt"
    }
  ],
});

if (success) {
  const vsix = await readVsix({
    packagePath: "path/to/vsix"
  });
  console.log(vsix);
}
```

## 📄 License

Published under [MIT License](./LICENSE).

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/vitest-testdirs?style=flat&colorA=18181B&colorB=4169E1
[npm-version-href]: https://npmjs.com/package/vitest-testdirs
[npm-downloads-src]: https://img.shields.io/npm/dm/vitest-testdirs?style=flat&colorA=18181B&colorB=4169E1
[npm-downloads-href]: https://npmjs.com/package/vitest-testdirs
[jsr-version-src]: https://jsr.io/badges/@luxass/vitest-testdirs?style=flat&labelColor=18181B&logoColor=4169E1
[jsr-version-href]: https://jsr.io/@luxass/vitest-testdirs
