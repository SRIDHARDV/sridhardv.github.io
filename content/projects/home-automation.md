---
title: Home Automation Node
summary: A Wi-Fi connected controller speaking MQTT, with a local display and battery backup so it keeps working when the power does not.
cover: assets/img/projects/home-automation.svg
tags: [IoT, MQTT, ESP32, Firmware]
year: 2023
order: 6
repo:
---

A self-contained automation node designed around one rule: it should stay useful when the network is down and when the mains are out.

## Hardware

- A **Wi-Fi capable microcontroller** as the brain
- A **local display** showing state and sensor readings without needing a phone
- A **rechargeable backup battery** with charge management, so a power cut does not mean a dead node
- Relay outputs for switching loads, and inputs for sensors and physical buttons

## Software

MQTT for messaging, with retained topics so a client that connects late still sees current state, and last-will messages so the broker knows immediately when a node drops off.

The control logic lives **on the device**, not in the cloud. The broker is how you observe and command the node, not how it decides what to do. Pull the network cable and the buttons still work, the schedules still run, and the display still tells you what is happening.

## Power metering

A related strand of this work: porting the **RN8209C** power metering SDK to run on ESP32 under Arduino, so a node can measure what it is actually switching rather than just reporting on or off.

## Status

Running in place. The battery has justified itself more than once.
