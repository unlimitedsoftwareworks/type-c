#!/bin/bash

set -e 

for i in {1..9}
do
   node outs/index.js -c tests/test$i -o ./output  --generate-ir --run
done

