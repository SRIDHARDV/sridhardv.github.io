---
title: Linux on Mobile
summary: Replacing Android with a mainline-style Linux distribution on a Xiaomi handset — turning retired phone hardware into a capable embedded development target.
cover: assets/img/projects/linux-on-mobile.svg
tags: [Linux, Kernel, Android, Halium]
year: 2025
order: 4
repo: https://github.com/SRIDHARDV/halium-devices
---

A retired smartphone is an absurdly good embedded platform: a multi-core SoC, gigabytes of RAM, a screen, a battery, Wi-Fi, Bluetooth, cellular, and a full sensor suite — for less than the cost of a dev board with a fraction of the capability. The only thing wrong with it is the operating system.

## The target

Xiaomi hardware on the **MSM8937** platform (`land`), working from the LineageOS device tree and kernel as a starting point.

## The approach

Working through the **Halium** project's structure, which reuses the Android kernel and vendor blobs to bring up hardware while running a normal GNU/Linux userspace on top. That is the pragmatic path: the alternative — mainlining a Qualcomm SoC from scratch — is a multi-year project on its own.

The work involves:

- Building the device kernel with the config options a Linux userspace expects
- Getting the Android hardware abstraction layers reachable from the Linux side for display, sensors, and radios
- Working out what boots, what half-works, and what needs replacing

## Why it matters

Once it boots, you have a full Linux system with direct access to a rich set of hardware — a real development target for anything sensor-driven or connectivity-driven, with the peripherals already attached and characterised.

## Contributions

I've contributed to the Halium documentation and device configuration repositories along the way.
