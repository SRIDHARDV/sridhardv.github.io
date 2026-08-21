---
title: Li-Ion BMS with an AFE-BMS
summary: A battery management system for 18650 packs built around TI's bq76930 AFE-BMS — cell monitoring, protection, and passive balancing.
cover: assets/img/projects/li-ion-bms.svg
tags: [Hardware, PCB Design, Firmware, Power]
year: 2024
order: 1
repo:
---

A complete battery management system for multi-cell Li-Ion packs assembled from 18650 cells, built around Texas Instruments' **bq76930** — an AFE-BMS, the analog front end that sits between the cells and the controller and does the measuring, protecting, and balancing.

## Why

Off-the-shelf BMS boards are cheap but opaque — you cannot see per-cell behaviour, tune protection thresholds, or log anything useful. I wanted a pack I could actually instrument.

## What it does

- **Per-cell voltage monitoring** across the series stack, read over I²C from the AFE-BMS
- **Temperature sensing** with thermistors placed against the cells
- **Protection** for over-voltage, under-voltage, over-current, and short circuit, with thresholds configured in firmware rather than fixed by hardware
- **Passive cell balancing** to keep the stack matched across charge cycles
- **Coulomb counting** for a state-of-charge estimate that survives partial cycles

## Hardware notes

The design puts the AFE-BMS and its protection FETs on a board sized to sit directly on top of the cell pack. The high-current path is kept short and wide; the sense lines are routed away from it. Cell taps use a connector that cannot be seated incorrectly — a lesson learned the expensive way.

## Firmware

Bare-metal C driving the AFE-BMS over I²C, with a small state machine for charge / discharge / fault handling and a serial interface for reading live cell data during testing.

## Status

Working prototype, running on the bench and inside a portable power pack.
