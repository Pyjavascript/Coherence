// Brand panel copy: all labels, placeholders, tooltips, popups and toasts.
// Values with {curly} names are filled in at runtime (see fill).
// Option `value`s are the ids saved on the brand and sent to the generate
// function (lib/constants), so only the labels here are shown to people.

export const brandPanelCopy = {
  header: {
    untitled: "Your new brand",
    unsavedBadge: "Not saved yet",
    unsavedTooltip: "You have changes that aren't saved yet",
    historyLabel: "Past results",
    historyTooltipUnsaved: "Your past results. Save your brand to keep them",
    historyTooltipSaved: "Your past results",
    closeTooltip: "Hide panel",
  },

  brandCore: {
    heading: "Your brand",
    name: {
      label: "Brand name",
      placeholder: "Like Ferox Parfums",
    },
    image: {
      add: "Add a logo",
      change: "Change logo",
    },
    belief: {
      label: "What you believe",
      placeholder: "Like: Scent is memory, not marketing",
    },
    industry: {
      label: "Your industry",
      tag: "Pixel layer",
      options: [
        { value: "general", label: "All industries" },
        { value: "beauty", label: "Beauty and personal care" },
        { value: "fashion", label: "Fashion and clothing" },
        { value: "food", label: "Food and drink" },
        { value: "wellness", label: "Health and wellness" },
        { value: "tech", label: "Tech and software" },
        { value: "finance", label: "Finance" },
        { value: "realestate", label: "Real estate" },
        { value: "hospitality", label: "Travel and stays" },
        { value: "retail", label: "Retail and online stores" },
        { value: "auto", label: "Cars and auto" },
      ],
    },
    delete: {
      label: "Delete brand",
      tooltipUnsaved: "Nothing to delete yet. Save your brand first",
      tooltipSaved: "Delete brand",
    },
    save: {
      idle: "Save",
      saving: "Saving…",
      saved: "Saved ✓",
      dirty: "Save changes",
      tooltip: "Save your brand ({keys})",
    },
  },

  toneOfVoice: {
    heading: "Tone of voice",
    funnelStage: {
      label: "Where they are",
      options: [
        { value: "Discovery", label: "Just finding you" },
        { value: "Consideration", label: "Thinking it over" },
        { value: "Trust", label: "Building trust" },
        { value: "Purchase", label: "Ready to buy" },
        { value: "Experience", label: "Using it" },
        { value: "Loyalty", label: "Coming back" },
      ],
    },
    language: {
      label: "How you speak",
      options: [
        { value: "Emotional", label: "From the heart" },
        { value: "Rational", label: "Facts first" },
        { value: "Cultural", label: "Rooted in culture" },
        { value: "Instructional", label: "Step by step" },
      ],
    },
    audiencePosture: {
      label: "Their mood right now",
      options: [
        { value: "Cold — scrolling, distracted", label: "Just scrolling by" },
        { value: "Warm — comparing options", label: "Comparing options" },
        { value: "Returning — already a customer", label: "Already a customer" },
        { value: "In-store — glancing at shelf", label: "Looking at the shelf" },
      ],
    },
  },

  fineTuning: {
    heading: "Fine tuning",
    painPoints: {
      label: "What's worrying them",
      placeholder: "What's on their mind right before this?",
    },
    desiredEmotions: {
      label: "How they should feel",
      options: [
        { value: "Curiosity", label: "Curious" },
        { value: "Trust", label: "Trusting" },
        { value: "Urgency", label: "Eager" },
        { value: "Comfort", label: "Comforted" },
        { value: "Status", label: "Special" },
        { value: "Belonging", label: "At home" },
      ],
    },
    formality: {
      label: "How formal",
      options: [
        { value: "Conversational", label: "Friendly" },
        { value: "Casual", label: "Relaxed" },
        { value: "Formal", label: "Formal" },
        { value: "Technical", label: "Technical" },
      ],
    },
    objection: {
      label: "A doubt to ease",
      placeholder: "Like: will it last all day?",
    },
    ctaIntensity: {
      label: "How strongly to ask",
      options: [
        { value: "Soft", label: "Gentle" },
        { value: "Direct", label: "Clear" },
        { value: "Urgent", label: "Right now" },
      ],
    },
    avoidWords: {
      label: "Words to skip",
      placeholder: "Like: cheap",
    },
    researchNotes: {
      label: "Your notes",
      count: "{n}",
    },
    location: {
      label: "Where they live",
      placeholder: "Like Mumbai, India",
    },
    outputLanguage: {
      label: "Write in",
      options: [
        { value: "English", label: "English" },
        { value: "Hindi", label: "Hindi" },
        { value: "Hinglish", label: "Hinglish" },
        { value: "Spanish", label: "Spanish" },
        { value: "French", label: "French" },
        { value: "German", label: "German" },
        { value: "Portuguese", label: "Portuguese" },
        { value: "Italian", label: "Italian" },
        { value: "Dutch", label: "Dutch" },
        { value: "Arabic", label: "Arabic" },
        { value: "Japanese", label: "Japanese" },
        { value: "Korean", label: "Korean" },
        { value: "Chinese (Simplified)", label: "Chinese (Simplified)" },
        { value: "Indonesian", label: "Indonesian" },
        { value: "Turkish", label: "Turkish" },
      ],
    },
    stylePack: {
      label: "Style",
      options: [
        { value: "classic", label: "Classic" },
        { value: "heritage", label: "Timeless luxury" },
        { value: "genz", label: "Gen Z fresh" },
        { value: "mintech", label: "Clean and techy" },
      ],
    },
    footerNote: "Fine tuning comes with Premium.",
    lockedCallout: {
      title: "Want more control?",
      body: "Premium lets you choose style, place, language, worries, feelings, doubts, how strongly to ask, words to skip and your notes.",
    },
  },

  externalAi: {
    heading: "Use with other AI",
    copyButton: "Copy prompt",
  },

  freeHook: {
    heading: "Free hook",
    remaining: "1 free hook left today",
    used: "Free hook used. Next one in {time}",
    button: "Generate",
  },

  export: {
    heading: "Export",
    label: "Export format",
    options: [
      { value: "copy", label: "Copy all" },
      { value: "txt", label: "Text file (.txt)" },
      { value: "csv", label: "CSV file (.csv)" },
    ],
    button: "Export",
    tooltipEmpty: "Generate copy first to export it",
    tooltipReady: "Export your copy",
  },

  popups: {
    coherencePrompt: {
      title: "Your brand prompt",
      body: "Paste it into ChatGPT for on-brand copy.",
      button: "Copy prompt",
      buttonDone: "Copied!",
    },
    hookGenerator: {
      title: "Your free hook",
      body: "A scroll-stopping line from your message.",
      label: "Your hook",
      button: "Copy hook",
      buttonDone: "Copied ✓",
      usedUp: "That's today's free hook. A new one arrives in {time}",
      unavailable: "We can't create hooks here right now",
      failed: "Something went wrong. Close this and try once more",
    },
    deleteBrand: {
      title: "Delete brand?",
      body: "Removes {name}, its notes and past results.",
      note: "You won't be able to undo this.",
      confirm: "Yes, delete it",
      cancel: "Cancel",
    },
  },

  toasts: {
    // type: "success" | "error" | "warning" | "neutral"
    saveNoName: { type: "error", message: "Give your brand a name first" },
    saveUnavailable: { type: "error", message: "Saving isn't available here yet" },
    saveLimit: { type: "error", message: "You've reached your limit of {n} brands" },
    saveSuccess: { type: "success", message: "Your brand is saved" },
    saveFailed: { type: "error", message: "We couldn't save that. Please try again" },

    deleteUnsaved: { type: "warning", message: "This brand isn't saved yet, so there's nothing to delete" },
    deleteSuccess: { type: "neutral", message: "Your brand has been deleted" },
    deleteFailed: { type: "error", message: "We couldn't delete that. Please try again" },

    imageUnreadable: { type: "error", message: "We couldn't open that image. Try a PNG, JPG or SVG" },

    promptCopied: { type: "success", message: "Prompt copied. Paste it into ChatGPT or any AI you like" },
    hookCopied: { type: "success", message: "Hook copied" },
    historyCopied: { type: "success", message: "Copied from your past results" },
    copyBlocked: { type: "error", message: "We couldn't copy that for you. Please select and copy it yourself" },
    hookEmpty: { type: "error", message: "Generate a hook first" },

    exportEmpty: { type: "error", message: "Generate copy first to export it" },
    exportTxt: { type: "success", message: "Your text file is ready" },
    exportCsv: { type: "success", message: "Your CSV file is ready" },
    copyAll: { type: "success", message: "Copied {n} pieces. Paste them anywhere" },

    restoreGrid: { type: "success", message: "{medium} is back on the grid" },
    restoreStudio: { type: "success", message: "{category} is back in Node Studio" },
    restoreGridFailed: { type: "error", message: "We couldn't bring that back to the grid" },
    restoreStudioFailed: { type: "error", message: "We couldn't bring that back to the studio" },

    noteAddFailed: { type: "error", message: "We couldn't add that note" },
    noteDeleteFailed: { type: "error", message: "We couldn't remove that note" },
    notesLoadFailed: { type: "error", message: "We couldn't load your notes" },

    stylePackLocked: { type: "error", message: "Styles open up with Premium" },

    // These focus Brand name when the panel is open
    needBrand: { type: "error", message: "Let's start with your brand" },
    needBrandName: { type: "error", message: "Add your brand name to begin" },
    sampleLoaded: { type: "success", message: "Here's a sample brand. Press Generate to see it in action" },
  },
};

// Fills {placeholders}: fill(brandPanelCopy.freeHook.used, { time: "3h 20m" })
export function fill(text, vars = {}) {
  return text.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`));
}

// Toast types → the status classes StatusBar reads.
const TOAST_CLS = { success: "ok", error: "err", warning: "warn", neutral: "" };

// setStatus(...toast("saveLimit", { n: 3 }))
export function toast(key, vars) {
  const { type, message } = brandPanelCopy.toasts[key];
  return [fill(message, vars), TOAST_CLS[type]];
}
