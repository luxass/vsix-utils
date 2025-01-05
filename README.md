# vsix-utils

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![jsr version][jsr-version-src]][jsr-version-href]

utilities for working with vsix files

> [!NOTE]
> If you are looking for a way to create vsix files programmatically, you can use the [vsix-builder](https://github.com/luxass/vsix-builder) package, or if you just want to build with a CLI, you can use [vsix-pack](https://github.com/luxass/vsix-pack).
> This is just the building blocks, that powers vsix-builder and vsix-pack.

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

[npm-version-src]: https://img.shields.io/npm/v/vsix-utils?style=flat&colorA=18181B&colorB=4169E1
[npm-version-href]: https://npmjs.com/package/vsix-utils
[npm-downloads-src]: https://img.shields.io/npm/dm/vsix-utils?style=flat&colorA=18181B&colorB=4169E1
[npm-downloads-href]: https://npmjs.com/package/vsix-utils
[jsr-version-src]: https://jsr.io/badges/@luxass/vsix-utils?style=flat&labelColor=18181B&logoColor=4169E1
[jsr-version-href]: https://jsr.io/@luxass/vsix-utils
