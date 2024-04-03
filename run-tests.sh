#!/bin/bash

for i in {1..20}
do
   node outs/index.js -c tests/test$i -o ./output
done

