<div align="center">

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║    ██████╗ ██████╗ ███████╗███████╗███╗   ██╗                       ║
║   ██╔════╝ ██╔══██╗██╔════╝██╔════╝████╗  ██║                       ║
║   ██║  ███╗██████╔╝█████╗  █████╗  ██╔██╗ ██║                       ║
║   ██║   ██║██╔══██╗██╔══╝  ██╔══╝  ██║╚██╗██║                       ║
║   ╚██████╔╝██║  ██║███████╗███████╗██║ ╚████║                       ║
║    ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝  W A V E   A I       ║
║                                                                      ║
║          Dynamic Green Corridor System for Emergency Vehicles        ║
║                  Built for Bengaluru. Designed for India.            ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

**Build for Bengaluru 2.0 · Problem Statement 2.3 · Healthcare & Well-being**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![WebSocket](https://img.shields.io/badge/WebSocket-10fps_realtime-00ff88?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Vite](https://img.shields.io/badge/Vite-5.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

<br/>

> *"Every 6-minute delay in ambulance response doubles a cardiac patient's chance of death.*
> *In Bengaluru, the average delay is 34 minutes. We built the fix."*

</div>

---

# 🚨 The Problem


Bengaluru is one of the **most traffic-congested cities in the world**, and this congestion directly affects emergency response times.

For emergency medical services this creates a life-threatening situation.

### Key Challenges

- 🚑 Ambulances frequently get stuck in traffic  
- ⏱ Critical treatment windows are missed  
- ⚠ Survival chances decrease due to delays  

Medical studies show:

> **Every 6-minute delay in ambulance response doubles the mortality risk for cardiac arrest patients.**

Yet current traffic signal systems operate **independently**, without any coordination for emergency vehicles.

---

# 💡 Our Solution — GreenWave AI

GreenWave AI dynamically creates a **real-time traffic corridor** for emergency vehicles.

When an ambulance is dispatched:

1. AI calculates the **optimal route to the hospital**
2. Traffic signals along the route **automatically turn green**
3. Cross-traffic signals are **temporarily paused**
4. Signals return to normal after the ambulance passes

### Result

```
Average response time
34 minutes → under 10 minutes
```

Use Control + Shift + m to toggle the tab key moving focus. Alternatively, use esc then tab to move to the next interactive element on the page.

Attach files by dragging & dropping, selecting or pasting them.
   ```bash
   npm install
   ```
3. Create a `.env.local` file and add your Google Maps API Key:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

## 📝 License
This project is licensed under the MIT License.
