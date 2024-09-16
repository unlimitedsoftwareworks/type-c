#!/bin/bash

set -e 

for i in {0..14}
do
   node outs/index.js -c tests/test$i -o ./output  --generate-ir --run
done

