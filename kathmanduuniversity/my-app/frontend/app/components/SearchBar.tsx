// my-app/frontend/app/components/SearchBar.tsx

"use client";
import { useState } from "react";

export default function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [text, setText] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSearch(text);
    setText(""); // Clear input after search
  };

  return (
    <div style={{
      position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)",
      zIndex: 1100, width: "90%", maxWidth: "420px"
    }}>
      <form onSubmit={submit} style={{
        display: "flex", backgroundColor: "white", borderRadius: "24px",
        padding: "5px 15px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", alignItems: "center"
      }}>
        <input 
          type="text" 
          placeholder="Search location..." 
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1, border: "none", outline: "none", padding: "10px", fontSize: "16px", borderRadius: "24px", color: "#333" }}
        />
        <button type="submit" style={{ border: "none", background: "none", cursor: "pointer", display: "flex" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#70757a"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        </button>
      </form>
    </div>
  );
}


// "use client";
// import { useState } from "react";

// export default function Sidebar({
//   onSearch,
//   onRoute,
//   onFilterChange,
//   onReportSubmit,
//   selectedLocation,
//   placeInfo,
// }: {
//   onSearch: (query: string) => void;
//   onRoute: (from: string, to: string) => void;
//   onFilterChange: (filters: any) => void;
//   onReportSubmit: (file: File) => void;
//   selectedLocation?: { lat: number; lng: number };
//   placeInfo?: { score?: number; reviews?: number };
// }) {
//   const [search, setSearch] = useState("");
//   const [from, setFrom] = useState("");
//   const [to, setTo] = useState("");
//   const [filters, setFilters] = useState({
//     wheelchair: false,
//     toilet: false,
//     ramp: false,
//   });

//   return (
//     <div style={styles.sidebar}>
//       <h3>🗺 Accessibility Map</h3>

//       {/* Search */}
//       <form
//         onSubmit={(e) => {
//           e.preventDefault();
//           if (!search.trim()) return;
//           onSearch(search);
//           setSearch("");
//         }}
//       >
//         <input
//           placeholder="Search location..."
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           style={styles.input}
//         />
//       </form>

//       {/* Route */}
//       <h4>Route</h4>
//       <input placeholder="From" value={from} onChange={(e) => setFrom(e.target.value)} style={styles.input} />
//       <input placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} style={styles.input} />
//       <button onClick={() => onRoute(from, to)} style={styles.btn}>Find Route</button>

//       {/* Filters */}
//       <h4>Services</h4>
//       {["wheelchair", "toilet", "ramp"].map((k) => (
//         <label key={k} style={styles.checkbox}>
//           <input
//             type="checkbox"
//             checked={(filters as any)[k]}
//             onChange={(e) => {
//               const updated = { ...filters, [k]: e.target.checked };
//               setFilters(updated);
//               onFilterChange(updated);
//             }}
//           />
//           {k === "wheelchair" && " ♿ Wheelchair"}
//           {k === "toilet" && " 🚻 Toilet"}
//           {k === "ramp" && " ↗️ Ramp"}
//         </label>
//       ))}

//       {/* Coordinates */}
//       <h4>Selected Point</h4>
//       <div style={styles.meta}>
//         Lat: {selectedLocation?.lat ?? "—"} <br />
//         Lng: {selectedLocation?.lng ?? "—"}
//       </div>

//       {/* Accessibility Score */}
//       <h4>Accessibility</h4>
//       <div style={styles.meta}>
//         Score: ⭐ {placeInfo?.score ?? "N/A"} <br />
//         Reviews: 💬 {placeInfo?.reviews ?? 0}
//       </div>

//       {/* Report */}
//       <h4>Report Issue</h4>
//       <input
//         type="file"
//         accept="image/*"
//         onChange={(e) => e.target.files && onReportSubmit(e.target.files[0])}
//       />
//     </div>
//   );
// }

// const styles: any = {
//   sidebar: {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     height: "100vh",
//     width: "280px",
//     background: "#fff",
//     padding: "14px",
//     zIndex: 1200,
//     boxShadow: "2px 0 10px rgba(0,0,0,0.15)",
//     overflowY: "auto",
//   },
//   input: {
//     width: "100%",
//     padding: "10px",
//     marginBottom: "8px",
//     borderRadius: "8px",
//     border: "1px solid #ddd",
//   },
//   btn: {
//     width: "100%",
//     padding: "10px",
//     borderRadius: "8px",
//     background: "#2563eb",
//     color: "white",
//     border: "none",
//     cursor: "pointer",
//     marginBottom: "10px",
//   },
//   checkbox: {
//     display: "block",
//     marginBottom: "6px",
//     cursor: "pointer",
//   },
//   meta: {
//     fontSize: "14px",
//     background: "#f5f5f5",
//     padding: "8px",
//     borderRadius: "6px",
//     marginBottom: "10px",
//   },
// };