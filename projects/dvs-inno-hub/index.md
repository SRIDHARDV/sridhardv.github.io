---
title: DVS INNO HUB
summary: A self-hosted home lab — hardened OpenWrt router, NAS, and a Jetson Orin Nano doing AI inference at the edge.
cover: assets/img/projects/dvs-inno-hub.svg
tags: [Networking, Self-Hosted, Edge AI, Linux]
year: 2025
order: 3
repo:
---

The home lab I use as a permanent test bench — and as the place where anything I want to actually keep running, runs.

## The router

An **OpenWrt** build serving as the network's edge, configured well past the defaults:

- VLAN segmentation separating trusted devices, IoT devices, and guests
- Firewall rules that keep IoT gear off the trusted network entirely
- DNS-level filtering and local DNS for the lab's own services
- WireGuard for remote access without exposing anything to the open internet

I'm currently evaluating a **NanoPi R5S (RK3568)** as the next hardware generation for this role.

## Storage

A NAS holding project archives, board images, and backups, with scheduled snapshots. It's also the artifact store for firmware builds — being able to go back to the exact image that was on a board six months ago has saved me more than once.

## Edge AI

An **NVIDIA Jetson Orin Nano** running inference workloads locally: vision models for camera streams, and a place to test what does and doesn't fit inside an edge power budget before it goes anywhere near a product.

## Why bother

Every piece of this doubles as a rehearsal for problems that show up in real embedded products — network isolation, secure remote access, reproducible images, and inference inside a thermal envelope.
