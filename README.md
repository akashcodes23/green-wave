# 🚑 Greenwave AI

Greenwave AI is an intelligent emergency vehicle routing and traffic preemption system. It ensures ambulances get to their destinations as quickly and safely as possible by manipulating traffic signals to create a continuous "green wave" along the route.

## 🌟 Features

- **Real-Time Routing**: Utilizes Google Maps Directions API to find the optimal route for emergency vehicles.
- **Dynamic Traffic Preemption**: Simulates the control of traffic lights along the route, turning them green as the ambulance approaches.
- **Live Map Visualization**: Interactive map using `@vis.gl/react-google-maps` to display the ambulance's live location, route corridor, and current signal states.
- **Multi-Ambulance Dispatching**: Capable of tracking and managing multiple emergency vehicles simultaneously.
- **AI Predictions**: Backend AI models for predicting traffic flow and optimizing signal timings.
- **Dashboard & Metrics**: Comprehensive dashboard to view active dispatches, live logs, and performance metrics.

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js (React)
- **Styling**: Native CSS / Tailwind CSS
- **Maps**: Google Maps JavaScript API via `@vis.gl/react-google-maps`
- **State Management**: React Hooks (`useMultiAmbulance`, `useSimulation`, etc.)

### Backend
- **Framework**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Real-time**: WebSockets for live location and signal state updates
- **AI**: Custom prediction models for traffic analysis

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- A Google Maps API Key (with Maps JavaScript API and Directions API enabled)
- A Supabase account

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
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
