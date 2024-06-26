
<img align="center" src='assets/logo.png' width='100%'>
<br/>            

<hr/>

Type-C is an expressive multi-paradigm programming language with emphasis on type safety and run-time performance. This repository contains the Type-C compiler, which can be installed by cloning this repo or installing it via npm (in progress).

For the Virtual Machine, please refer to the [Type-V Project](https://github.com/unlimitedsoftwareworks/type-v)

## Show some code!
![tc-snippet.png](assets/snippet.png)

## Getting started:

```sh
git clone https://github.com/unlimitedsoftwareworks/type-c
git clone https://github.com/unlimitedsoftwareworks/type-v
git clone https://github.com/unlimitedsoftwareworks/stdlib

cd type-c
npm install
npx tsc

cd ../type-v
mkdir build
cd build
cmake ..
make

cd ../type-c
node outs/index.js -c ./tests/test19 -o ./output -r
```

## Project Status
Still under **heavy** development. The compiler frontend is almost complete and the compiler will need to be heavily tested.
VM is being redesigned to support new form of concurrency.

Keep an eye on https://typec.praisethemoon.org/posts for updates

## Documentation
Official docs: https://typec.praisethemoon.org/docs/introduction

## Need help
Open an issue

## I want to help
If you want to get aquinted with the codebase, please reach out to me directly via my email at my profile. I will be happy to help you get started.