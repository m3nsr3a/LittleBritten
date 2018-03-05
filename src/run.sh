#!/usr/bin/env bash

# Tell a joke
check_truffle_version() {
    result=$(trfuffle verion)
    truffle compile
    truffle mi

    return 1
}

# Write message and exit with error.
die() {
    local message=$1
    [ -z "$message" ] && message="Died"
    echo "${BASH_SOURCE[1]}: line ${BASH_LINENO[0]}: ${FUNCNAME[1]}: $message." >&2
    exit 1
}

# Establish run order
main() {
#    if [check_truffle_version] then else die "Kaboom";
    pip3 install -r requirements.txt
    gunicorn -c static_server.py static_server:app
}

main

exit 0