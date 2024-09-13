#!/bin/bash

set -e 

for i in {0..13}
do
   node outs/index.js -c tests/test$i -o ./output  --generate-ir --run
done

