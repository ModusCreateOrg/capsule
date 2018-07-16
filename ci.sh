#!/usr/bin/env bash

# http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail
IFS=$'\n\t'

# Credit to Stack Overflow questioner Jiarro and answerer Dave Dopson
# http://stackoverflow.com/questions/59895/can-a-bash-script-tell-what-directory-its-stored-in
# http://stackoverflow.com/a/246128/424301
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Search for all CF files within the repo
CF_TEMPLATES=$(find ${DIR}/* -type f  -name '*.cf' )

for i in $CF_TEMPLATES ; do
    echo "Testing: $i"; \
        aws cloudformation validate-template --template-body "file://$i" > /dev/null ;
done
