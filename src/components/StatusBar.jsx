// import { useEffect, useState } from "react";

// const getTone = (status, unavailable) => {
//   if (status.text) {
//     if (status.cls === "err") return "error";
//     if (status.cls === "ok") return "success";
//     if (status.cls === "warn") return "warning";
//     return "info";
//   }
//   return unavailable ? "warning" : "";
// };

// export default function StatusBar({ status, unavailable }) {
//   const message = status.text || unavailable;
//   const tone = getTone(status, unavailable);
//   const [dismissed, setDismissed] = useState(false);

//   useEffect(() => {
//     setDismissed(false);
//   }, [message, status, tone]);

//   return (
//     <div className={`toast toast-${tone}${!message || dismissed ? " toast-hidden" : ""}`} role="alert" aria-live="assertive">
//       {tone === "error" && (
//         <span className="toast-icon toast-icon-error" aria-hidden="true">
//           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
//             <path d="M5 5l14 14M19 5L5 19" />
//           </svg>
//         </span>
//       )}
//       {tone === "info" && <span className="toast-icon toast-icon-info" aria-hidden="true">i</span>}
//       <p className="toast-text">{message}</p>
//       <button className="toast-close" type="button" aria-label="Dismiss notification" onClick={() => setDismissed(true)}>
//         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//           <path d="M12 10.8891L15.8891 7L17 8.11094L13.1109 12L17 15.8891L15.8891 17L12 13.1109L8.11094 17L7 15.8891L10.8891 12L7 8.11094L8.11094 7L12 10.8891Z" fill="white" />
//         </svg>

//       </button>
//     </div>
//   );
// }


import { useEffect, useState } from "react";
import { AlertIcon, InfoIcon, SuccessIcon, WarningIcon } from "../assets/globalAssets";

const getTone = (status, unavailable) => {
  if (status.text) {
    if (status.cls === "err") return "error";
    if (status.cls === "ok") return "success";
    if (status.cls === "warn") return "warning";
    return "info";
  }
  return unavailable ? "warning" : "";
};

export default function StatusBar({ status, unavailable }) {
  const message = status.text || unavailable;
  const tone = getTone(status, unavailable);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [message, status, tone]);

  return (
    <div className={`toast toast-${tone}${!message || dismissed ? " toast-hidden" : ""}`} role="alert" aria-live="assertive">
      
      {/* Dynamic Tone Icons */}
      {tone === "error" && (
        <span className="toast-icon toast-icon-error" aria-hidden="true">
          <img src={AlertIcon} alt="Error" width="40" height="40" />
        </span>
      )}
      {tone === "info" && (
        <span className="toast-icon toast-icon-info" aria-hidden="true">
          <img src={InfoIcon} alt="Info" width="40" height="40" />
        </span>
      )}
      {tone === "success" && (
        <span className="toast-icon toast-icon-success" aria-hidden="true">
          <img src={SuccessIcon} alt="Success" width="40" height="40" />
        </span>
      )}
      {tone === "warning" && (
        <span className="toast-icon toast-icon-warning" aria-hidden="true">
          <img src={WarningIcon} alt="Warning" width="40" height="40" />
        </span>
      )}

      <p className="toast-text">{message}</p>
      
      <button className="toast-close" type="button" aria-label="Dismiss notification" onClick={() => setDismissed(true)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 10.8891L15.8891 7L17 8.11094L13.1109 12L17 15.8891L15.8891 17L12 13.1109L8.11094 17L7 15.8891L10.8891 12L7 8.11094L8.11094 7L12 10.8891Z" fill="white" />
        </svg>
      </button>
    </div>
  );
}