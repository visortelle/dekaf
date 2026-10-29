if (navigator.platform.match('Mac') !== null) {
  const styleTag = document.createElement('style');

  styleTag.innerHTML = `
/* MACOS SCROLLBAR FIX START
MacOS hides scrollbars by default.
This CSS forces to show scrollbar always.
It doesn't work in Firefox yet. */
::-webkit-scrollbar {
    -webkit-appearance: none;
    background: var(--scrollbar-track-color);
}

::-webkit-scrollbar:vertical {
    width: 11px;
    padding: 0 1px;
    border-left: 1px solid var(--scrollbar-border-color);
    border-right: 1px solid var(--scrollbar-border-color);
}

::-webkit-scrollbar:horizontal {
    height: 11px;
    padding: 1px 0;
    border-top: 1px solid var(--scrollbar-border-color);
    border-bottom: 1px solid var(--scrollbar-border-color);
}

::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: var(--scrollbar-thumb-color);
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover-color);
}

::-webkit-scrollbar-thumb:vertical {
  border: 2px solid var(--scrollbar-border-color);
  border-top: none;
  border-bottom: none;
}

::-webkit-scrollbar-thumb:horizontal {
  border: 2px solid var(--scrollbar-border-color);
  border-left: none;
  border-right: none;
}
/* MACOS SCROLLBAR FIX END */
`;

  document.head.appendChild(styleTag);
}
