import { forwardRef, useLayoutEffect, useRef } from "react";

// Textarea that grows with its content instead of scrolling inside its box
// (Node Studio nodes, Quick Grid cards' settings and the brand panel).
const AutoTextarea = forwardRef(function AutoTextarea({ value, ...props }, forwardedRef) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // scrollHeight leaves out the border; add it back so a bordered box doesn't scroll by 2px.
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, [value]);
  const setRef = (el) => {
    ref.current = el;
    if (typeof forwardedRef === "function") forwardedRef(el);
    else if (forwardedRef) forwardedRef.current = el;
  };
  return <textarea ref={setRef} rows={1} value={value} {...props} />;
});

export default AutoTextarea;
