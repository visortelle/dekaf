#!/usr/bin/env bash

CSRF_TOKEN=$(curl http://localhost:7750/pulsar-manager/csrf-token)
curl \
    -H "X-XSRF-TOKEN: $CSRF_TOKEN" \
    -H "Cookie: XSRF-TOKEN=$CSRF_TOKEN;" \
    -H 'Content-Type: application/json' \
    -X PUT http://localhost:7750/pulsar-manager/users/superuser \
    -d '{"name": "pulsar", "password": "pulsar", "description": "test", "email": "username@test.org"}'
