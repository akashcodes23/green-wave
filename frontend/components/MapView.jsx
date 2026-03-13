"use client";

import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { BANGALORE_ROUTES } from "@/lib/bangaloreRoutes";

const API_KEY = "AIzaSyA4ZpRmfKitHUEs0o9FXQoswFh-y13uImY";
const TOTAL_STEPS = 140;



async function fetchRoadRoute(waypoints){

  const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(";");

  const url =
  `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  const data = await res.json();

  if(data.code !== "Ok"){
    return waypoints.map(w => ({lat:w.lat,lng:w.lng}));
  }

  return data.routes[0].geometry.coordinates.map(
    ([lng,lat]) => ({lat,lng})
  );
}



function getPosition(step,road){

  const t=Math.min(step/TOTAL_STEPS,1);
  const index=Math.floor(t*(road.length-1));

  return road[index] ?? road[0];
}



function getBearing(a,b){

  const dLng=(b.lng-a.lng)*(Math.PI/180);
  const lat1=a.lat*(Math.PI/180);
  const lat2=b.lat*(Math.PI/180);

  const y=Math.sin(dLng)*Math.cos(lat2);
  const x=
  Math.cos(lat1)*Math.sin(lat2)-
  Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLng);

  return ((Math.atan2(y,x)*180)/Math.PI+360)%360;
}



export default function MapView({
  dispatched,
  arrived,
  snapshot,
  selectedRoute
}){

const mapRef = useRef(null);
const map = useRef(null);

const road = useRef([]);
const ambulance = useRef(null);

const corridor = useRef(null);
const glow = useRef(null);

const googleRef = useRef(null);

const route =
BANGALORE_ROUTES[selectedRoute] ||
BANGALORE_ROUTES.route1;

const step = snapshot?.step ?? 0;



/* MAP INIT */

useEffect(()=>{

let mounted=true;

const loader=new Loader({
apiKey:API_KEY,
version:"weekly"
});

loader.load().then((google)=>{

if(!mounted) return;

googleRef.current = google;

map.current=new google.maps.Map(mapRef.current,{
center:route.waypoints[0],
zoom:14,
disableDefaultUI:true,
zoomControl:true,
mapTypeId:"roadmap"
});

const traffic=new google.maps.TrafficLayer();
traffic.setMap(map.current);

});

return()=>{mounted=false}

},[]);



/* ROUTE LOAD */

useEffect(()=>{

if(!map.current || !googleRef.current) return;

const google = googleRef.current;


/* reset */

road.current = [];

ambulance.current?.setMap(null);
ambulance.current = null;

corridor.current?.setMap(null);
glow.current?.setMap(null);


/* center map */

map.current.setCenter(route.waypoints[0]);
map.current.setZoom(14);


/* fetch road */

fetchRoadRoute(route.waypoints).then(points=>{

road.current = points;


/* corridor base */

corridor.current=new google.maps.Polyline({
path:points,
strokeColor:"#00a86b",
strokeOpacity:0.3,
strokeWeight:12
});

corridor.current.setMap(map.current);


/* bright corridor */

glow.current=new google.maps.Polyline({
path:points,
strokeColor:"#00ff88",
strokeOpacity:1,
strokeWeight:4,
icons:[{
icon:{
path:"M 0,-1 0,1",
strokeOpacity:1,
scale:4
},
offset:"0",
repeat:"12px"
}]
});

glow.current.setMap(map.current);


/* fit bounds */

const bounds=new google.maps.LatLngBounds();
points.forEach(p=>bounds.extend(p));

map.current.fitBounds(bounds);

});

},[selectedRoute]);



/* AMBULANCE MOVEMENT */

useEffect(()=>{

if(!dispatched || arrived) return;
if(!road.current.length) return;
if(!googleRef.current) return;

const google = googleRef.current;

const pos=getPosition(step,road.current);
const next=getPosition(step+1,road.current);

const bearing=getBearing(pos,next);


/* ambulance icon */

const icon={
path:google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
scale:7,
fillColor:"#e53935",
fillOpacity:1,
strokeWeight:1,
rotation:bearing
};


if(!ambulance.current){

ambulance.current=new google.maps.Marker({
position:pos,
map:map.current,
icon,
zIndex:999
});

}else{

ambulance.current.setPosition(pos);
ambulance.current.setIcon(icon);

}


/* follow ambulance */

if(step%6===0){
map.current.panTo(pos);
}

},[step,dispatched,selectedRoute]);



/* ARRIVAL */

useEffect(()=>{

if(!arrived || !road.current.length) return;

const last=road.current[road.current.length-1];

ambulance.current?.setPosition(last);

},[arrived]);



/* UI */

return(
<div style={{width:"100%",height:"100%",position:"relative"}}>

<div ref={mapRef} style={{width:"100%",height:"100%"}}/>

<div style={{
position:"absolute",
top:14,
left:14,
background:"rgba(255,255,255,0.95)",
padding:"10px 16px",
borderRadius:6,
fontFamily:"monospace",
color:"#222",
fontSize:11,
boxShadow:"0 2px 10px rgba(0,0,0,0.15)"
}}>

<div style={{color:"#00a86b",fontWeight:"bold"}}>
GREENWAVE AI
</div>

<div>📍 {route.origin.name}</div>
<div>🏥 {route.destination.name}</div>

</div>

</div>
);

}