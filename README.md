# PC Compatibility Checker

A web-based tool for checking PC hardware compatibility, estimating power requirements and finding alternative components.

## Features

- **Hardware compatibility checks** – checks compatibility between selected PC components.
- **CPU and motherboard compatibility** – checks CPU sockets and BIOS-related warnings.
- **RAM compatibility** – checks memory type, capacity, number of modules and supported speeds.
- **GPU and PSU compatibility** – checks power requirements and available power connectors.
- **Power estimation** – estimates the system's power consumption.
- **Alternative components** – suggests other components when compatibility issues are detected.
- **Compatibility overview** – displays errors, warnings and successful checks.

## Supported Components

The database currently includes:

| Component | Number of entries |
|---|---:|
| CPUs | 67 |
| Motherboards | 69 |
| RAM kits | 58 |
| Graphics cards | 52 |
| Power supplies | 53 |
| **Total** | **299** |

## Technologies

- HTML
- CSS
- JavaScript
- JSON

## Project Structure

```text
PC-Compatibility-Checker/
│
├── data/
│   ├── cpu.json
│   ├── motherboard.json
│   ├── ram.json
│   ├── gpu.json
│   └── psu.json
│
├── index.html
├── style.css
├── script.js
└── README.md
```

## Getting Started

You can use the project locally or through GitHub Pages.

1. Clone or download this repository.
2. Open the project folder in Visual Studio Code.
3. Start a local development server, for example with the Live Server extension.
4. Open the provided local URL in your browser.

**Important:** The project uses JavaScript `fetch()` to load JSON files. Because of browser security restrictions, it should be run through a local web server rather than opened directly as a `file://` URL.

## Disclaimer

This tool is intended as a general compatibility guide. It checks selected hardware specifications and common compatibility requirements, but it cannot guarantee 100% compatibility.

Always verify component specifications with their manufacturers before purchasing hardware.

## Project Status

This project is a work in progress. The component database and compatibility checks may be updated and improved over time.