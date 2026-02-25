# Sahayatri - Wheelchair Navigation for Kathmandu Valley

## Table of Contents
- [About](#about)
- [Features](#features)
- [Technologies](#technologies)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage Guide](#usage-guide)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Acknowledgments](#acknowledgments)

---

## About

Sahayatri is a specialized wheelchair navigation application designed for Kathmandu Valley, including Kathmandu, Bhaktapur, and Lalitpur and for on campus - Kathmandu University.

It helps wheelchair users navigate safely by avoiding hazards like stairs, steep inclines, narrow alleys, and cobblestone streets.

---

## Features

### Accessibility-Aware Routing
Color-coded routes based on safety levels - green for safe, yellow for caution, red for hazard.

### Real-Time Hazard Detection
Shows obstacles from OpenStreetMap and user-submitted reports.

### Area-Specific Warnings
Special alerts for Bhaktapur's historic areas and Kathmandu University campus.

### Search Places
Find locations across all three cities and university campus.

### Report Issues
Users can report new hazards to help the community.

### Export Routes
Download routes as GPX files for offline use.

### Multiple Map Styles
Choose between dark mode, streets view, satellite view, and terrain view.

---

## Technologies

### Frontend
- Next.js
- TypeScript
- Tailwind CSS

### Maps
- Leaflet.js
- OpenStreetMap

### Icons
- Lucide React

### APIs
- Nominatim for search
- OSRM for routing
- Overpass API for hazard data

### Voice
- Web Speech API for voice guidance

### Storage
- LocalStorage and IndexedDB for offline data

---

## Installation

### Prerequisites
- Node.js 18 or higher
- npm 9 or higher

### Steps

1. Clone the repository
```bash
git clone https://github.com/prashamsaadhikari1/codeyatra2.0_CacheMeIfYouCan_project.git
cd sahayatri
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Open in your browser
```
http://localhost:3000
```

---

## Environment Variables (Optional)

Create a .env file in the root directory:

```
REACT_APP_DEFAULT_CENTER_LAT=27.7172
REACT_APP_DEFAULT_CENTER_LNG=85.3240
REACT_APP_DEFAULT_ZOOM=14
```

---

## Usage Guide

### Quick Start

1. Allow location access when prompted by your browser

2. Type a place name in the search box to find your destination

3. Click on a search result to set it as your destination

4. Click the "Start Navigation" button to begin

5. Listen to voice instructions for turns and hazards

### Key Controls

| Control | Location | Function |
|---------|----------|----------|
| Search Bar | Right sidebar | Find places |
| Current Location | Right sidebar | Center map on your position |
| Voice Toggle | Bottom right | Turn voice guidance on or off |
| Report Issue | Bottom right | Submit new hazard reports |
| Map Style | Top left | Switch between map views |
| Start Navigation | Bottom center | Begin route guidance |

### Route Colors

- Green indicates safe routes with paved surfaces, adequate width, and gentle slopes
- Yellow indicates caution areas with moderate obstacles or inclines
- Red indicates hazards that should be avoided if possible

---

## Project Structure

```
my-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── places.js
│   │   │   ├── reports.js
│   │   │   ├── routes.js
│   │   │   └── spatial.js
│   │   ├── middleware/
│   │   │   └── upload.js
│   │   ├── models/
│   │   │   ├── path.js
│   │   │   ├── place.js
│   │   │   ├── reports.js
│   │   │   ├── reviews.js
│   │   │   └── spatial_ref_sys.js
│   │   ├── routes/
│   │   │   └── index.js
│   │   ├── services/
│   │   │   └── photoService.js
│   │   └── app.js
│   ├── .env
│   ├── .gitignore
│   ├── db.txt
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── app/
│   │   ├── api/
│   │   │   └── search/
│   │   │       └── route.ts
│   │   ├── demo/
│   │   │   └── page.tsx
│   │   ├── maps/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── map.tsx
│   │   ├── MapClient.tsx
│   │   ├── MapInterface.tsx
│   │   └── SearchBar.tsx
│   ├── library/
│   ├── public/
│   ├── .gitignore
│   ├── eslint.config.mjs
│   ├── jsconfig.json
│   ├── next-env.d.ts
│   ├── package.json
│   └── package-lock.json
│
├── .next/
├── node_modules/
└── .gitignore
```

---

## Contributing

We welcome contributions from the community.

### How to Contribute

1. Fork the repository

2. Create a feature branch
```bash
git checkout -b feature/YourFeature
```

3. Commit your changes
```bash
git commit -m 'Add Your Feature'
```

4. Push to the branch
```bash
git push origin feature/YourFeature
```

5. Open a Pull Request

### Reporting Issues

For map-related problems, use the in-app "Report Issue" button.

For bugs or technical issues, open a GitHub issue with:
- Steps to reproduce the problem
- Expected behavior
- Screenshots if applicable
- Browser and device information

---

## Acknowledgments

### Team Members

| Name | Role |
|------|------|
| Prashamsa Adhikari | Frontend Developer |
| Aamod Baral | Backend Developer |
| Reeshav Khyaju | Data and Testing |
| Savyata Adhikari | Backend Developer |

### Special Thanks

- OpenStreetMap contributors for providing free map data
- OSRM project for routing capabilities
- Beta testers from the wheelchair community
- Kathmandu Living Labs for local GIS support
- Disability Rights Nepal for user testing coordination
- Kathmandu University for campus mapping support
- Hackathon organizers for this opportunity
- Our mentors for their guidance

---
