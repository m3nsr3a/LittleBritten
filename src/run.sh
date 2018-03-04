#!/usr/bin/env bash

# Truffle version is really important.
check_truffle_version() {

    if type -p truffle; then
        echo "Found truffle executable in PATH, yay!"
        _truffle=truffle
    else
        die "There is no truffle deployment system found."

    fi

    if [[ "$_truffle" ]]; then
        version=$("$_truffle" version 2>&1 | awk -F ' ' '/v/ {print $2}')
        echo version "$version"
        if [[ "$version" > "4.0.5" ]]; then
            echo "Truffle version good."
        else
            die "Truffle version is not enough."
        fi
    fi
}

# Compile and deploy contracts.
compile_contracts_and_deploy() {
    truffle compile
    truffle migrate --network development --reset
}

# Get everything needed to launch static server.
resolve_python_dependencies() {
    if command -v python3 &>/dev/null; then
        echo "There is Python3 on this machine."
    else
        die "No Python3 found."
    fi

    pip3 install -r requirements.txt
}

# Write message and exit with error.
die() {
    local message=$1
    [ -z "$message" ] && message="Died"
    echo "${BASH_SOURCE[1]}: line ${BASH_LINENO[0]}: ${FUNCNAME[1]}: $message." >&2
    exit 1
}

# Establish launching pipeline.
main() {
    check_truffle_version;
    resolve_python_dependencies;
    compile_contracts_and_deploy;

    gunicorn -c conf.py static_server:app
    exit 0
}

main