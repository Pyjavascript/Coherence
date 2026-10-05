export default function StatusBar({ status, unavailable }) {
  return (
    <>
      <div className="statusbar" hidden={!status.text}>
        <div className="row">
          <span className={"status-text" + (status.cls ? " " + status.cls : "")}>{status.text}</span>
        </div>
      </div>
      <div className="statusbar" hidden={!unavailable}>
        <div className="row"><span className="status-text warn">{unavailable}</span></div>
      </div>
    </>
  );
}
