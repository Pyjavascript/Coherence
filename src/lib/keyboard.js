// On-screen keyboard: slide the app up over it, without resizing anything.
//
// Phones open the keyboard over the page and shrink only the visible area,
// so the bottom message box would end up under the keyboard. While a text
// field has focus and the keyboard is up, this sets --kb-lift on <html> to
// how much of the screen the keyboard covers (and the class kb-open). The
// app keeps its full size and slides up by that much (layout.css): the
// message box sits on the keyboard's edge and the top of the app runs off
// the top of the screen, as if cut, instead of everything squeezing. Closed
// again, it slides back.
//
// iOS also pans the page to reveal the field; that pan is undone, so the
// slide is the only movement and it's the same on every phone.

const MIN_KEYBOARD = 120; // smaller gaps are browser bars, not a keyboard

function isEditable(el) {
  if (!el || el === document.body) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if (el.tagName !== "INPUT") return false;
  return !/^(button|checkbox|color|file|hidden|image|radio|range|reset|submit)$/i.test(el.type);
}

function install() {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement;
  let frame = 0;
  let applied = false;

  const update = () => {
    frame = 0;
    const zoomed = Math.abs(vv.scale - 1) > 0.01; // pinch-zoom also shrinks it
    const covered = window.innerHeight - vv.height;
    const open = !zoomed && covered > MIN_KEYBOARD && isEditable(document.activeElement);
    if (open) {
      if (window.scrollY || vv.offsetTop) window.scrollTo(0, 0);
      root.style.setProperty("--kb-lift", `${Math.round(covered)}px`);
      if (!applied) root.classList.add("kb-open");
      applied = true;
    } else if (applied) {
      root.style.removeProperty("--kb-lift");
      root.classList.remove("kb-open");
      applied = false;
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  vv.addEventListener("resize", schedule);
  vv.addEventListener("scroll", schedule);
  window.addEventListener("focusin", schedule);
  // Blur fires before the keyboard starts closing; check again once it has.
  window.addEventListener("focusout", () => setTimeout(schedule, 50));
}

if (typeof window !== "undefined") install();
