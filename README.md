
<img align="center" src='assets/logo.png' width='100%'>
<br/>            

Type-C is an expressive multi-paradigm programming language with emphasis on type safety and run-time performance. This repository contains the Type-C compiler, which can be installed by cloning this repo or installing it via npm.

For the Virtual Machine, please refer to the [Type-C VM](https://https://github.com/unlimitedsoftwareworks/type-v)


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

## Documentation
Official docs: https://github.com/unlimitedsoftwareworks/tc-docs

## Need help
Open an issue

## I want to help
If you want to get aquinted with the codebase, please reach out to me directly via my email at my profile. I will be happy to help you get started.