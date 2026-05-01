# Shared Crypto Package

Reference implementation for the Ephemeral Onion Chat encryption protocol.

## Algorithm choices

- Key exchange: ECDH with P-256
- Content encryption: AES-256-GCM
- Key lifetime: ephemeral per room session

## Purpose

This package contains reusable Web Crypto helpers to keep protocol logic explicit and auditable.

In production, pin protocol versions and add formal test vectors.
