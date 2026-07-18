# Security

## Supported use

This repository is a single-user portfolio demo intended for local execution. It does not provide
authentication or account isolation and should not be exposed to untrusted networks as-is.
Docker Compose binds the web and API ports to `127.0.0.1` by default so they are not published to
other devices on the local network.

## Reporting

Please report vulnerabilities privately through GitHub's security advisory feature rather than a
public issue.

## Deployment note

A hosted multi-user version must add authentication, per-request authorization, rate limiting,
production secret management, HTTPS termination, database backups and a deployment-specific threat
model before accepting real data.
