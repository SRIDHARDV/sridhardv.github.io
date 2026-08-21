---
title: Secured USB/IP
summary: Adding a security layer to the Linux kernel's USB/IP stack, which passes USB devices over a network with no authentication or encryption of its own.
cover: assets/img/projects/secured-usbip.svg
tags: [Linux Kernel, Security, C, Drivers]
year: 2023
order: 2
repo: https://github.com/SRIDHARDV/Secured-USBIP
---

USB/IP lets a machine export a physical USB device over the network and have another machine treat it as if it were plugged in locally. It is genuinely useful — and it ships with no authentication and no encryption.

## The problem

The protocol trusts the network. Anyone who can reach the exporting host's port can attach the device; anyone on the path can read the traffic. For a debug rig on a lab bench that is tolerable. For anything else it is not.

## The work

A fork of the kernel's USB/IP implementation (kept under the original GPLv2) as a base for implementing a security protocol on top of the existing transport.

The pieces involved:

- **`usbip-vhci`** — the client-side virtual USB host controller
- **`usbip-host`** — the server-side stub driver that binds a physical device for export
- **`usbip-vudc`** — exporting virtual devices via the USB Gadget subsystem
- **`usbip-utils`** — the userspace tools for attaching and listing devices

## Approach

Authentication and session establishment before any URB traffic is allowed, so an unauthenticated peer never reaches the device at all — rather than bolting a tunnel around the outside and hoping the deployment remembers to use it.

A URB, or USB Request Block, is the structure the kernel uses to carry a single USB transfer. Gating at that layer means the check sits below anything a client could talk its way past.

## Status

Work in progress, in the open on GitHub.
