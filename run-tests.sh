#!/bin/bash

set -e 

for i in {0..19}
do
   node outs/index.js -c tests/test$i -o ./output  --generate-ir --run --no-warnings
done

