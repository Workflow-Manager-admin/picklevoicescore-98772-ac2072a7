#!/bin/bash
cd /home/kavia/workspace/code-generation/picklevoicescore-98772-ac2072a7/score_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

