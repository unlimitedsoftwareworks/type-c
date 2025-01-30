#!/bin/bash

set -e 

for i in {0..28}
do
   node dist/index.js -c tests/test$i -o ./output  --generate-ir --run --no-warnings
done

