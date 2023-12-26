if (navigator.platform.match('Mac') !== null) {
  const styleTag = document.createElement('style');

  styleTag.innerHTML = `
/* MACOS SCROLLBAR FIX START
MacOS hides scrollbars by default.
This CSS forces to show scrollbar always.
It doesn't work in Firefox yet. */
::-webkit-scrollbar {
    -webkit-appearance: none;
    background: #f5f5f5;
}

::-webkit-scrollbar:vertical {
    width: 11px;
    padding: 0 1px;
    border-left: 1px solid #ededed;
    border-right: 1px solid #ededed;
}

::-webkit-scrollbar:horizontal {
    height: 11px;
    padding: 1px 0;
    border-top: 1px solid #ededed;
    border-bottom: 1px solid #ededed;
}

::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: #c1c1c1;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #7e7e7e;
}

::-webkit-scrollbar-thumb:vertical {
  border: 2px solid #ededed;
  border-top: none;
  border-bottom: none;
}

::-webkit-scrollbar-thumb:horizontal {
  border: 2px solid #ededed;
  border-left: none;
  border-right: none;
}
/* MACOS SCROLLBAR FIX END */
`;

  document.head.appendChild(styleTag);
}
