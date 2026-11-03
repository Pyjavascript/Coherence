import { useEffect, useState } from "react";
import { logoFit, logoFitNow } from "../lib/image";

// An uploaded brand logo in a round badge. How it sits is read from the
// image itself (lib/image.js logoFit): on its own background colour, on
// white, or filling the badge. A trimmed logo is sized to the largest box of
// its shape that fits inside the circle, with a margin.
const MARGIN = 0.9;

export default function BrandLogo({ src, className = "" }) {
  const [fit, setFit] = useState(() => logoFitNow(src));

  useEffect(() => {
    let live = true;
    setFit(logoFitNow(src));
    logoFit(src).then((next) => live && setFit(next));
    return () => { live = false; };
  }, [src]);

  let size;
  if (fit?.aspect) {
    const diag = Math.hypot(fit.aspect, 1);
    size = {
      width: `${(fit.aspect / diag) * MARGIN * 100}%`,
      height: `${(1 / diag) * MARGIN * 100}%`,
    };
  }

  return (
    <span
      className={("brand-logo " + className).trim()}
      data-fit={fit?.kind}
      style={fit?.plate ? { "--logo-plate": fit.plate } : undefined}
    >
      <img src={fit?.src || src} alt="" style={size} />
    </span>
  );
}
