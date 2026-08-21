---
title: BACnet Node — Building Automation PoC
summary: A BACnet field device built on an open-source stack, with custom SMPS modules and I/O nodes for HVAC and environmental monitoring.
cover: assets/img/projects/bacnet-node.svg
tags: [BACnet, Hardware, Firmware, HVAC]
year: 2023
order: 5
repo:
---

A proof of concept for a BACnet field device that a real building management system would accept as a peer — not a gateway or a translator, but a native node.

## The stack

Built on an open-source BACnet stack, exposing standard object types so any BMS head-end can discover the device, read its points, and write setpoints without custom integration work.

## Objects exposed

- **Analog Input** — temperature, humidity, and pressure sensors
- **Binary Output** — relay control for fans, dampers, and valves
- **Analog Value** — setpoints writable from the head-end
- **Device** — with proper object identifiers so Who-Is / I-Am discovery behaves

## Custom hardware

Two boards were designed for this:

- An **offline SMPS module** running straight off 240 VAC mains and producing an isolated 5 VDC rail for the logic side — no external adapter, no separate supply to mount and wire
- An **I/O node** carrying the sensor front ends and relay drivers, with the isolation barrier where it belongs

## What I learned

Most of the difficulty in building automation is not the protocol — it is power, isolation, and surviving the electrical environment of a plant room. Getting from 240 VAC to a clean 5 VDC on the same board as the logic, with the creepage and clearance to justify it, took far longer than making the device speak BACnet. The protocol was the easy half.
