export const localStorageKeys = {
  messageExportConfig: "messageExportConfig",
  autoRefresh: "autoRefresh",
  defaultMessageFilterType: "defaultMessageFilterType",
  isHidePartitionedTopics: "isHidePartitionedTopics",
  /**
   * Cap on messages per second a consumer session DELIVERS, browser-wide. 0 = unlimited.
   *
   * Rides each Resume request (like `include_consumer_stats`), NEVER the session config: the
   * number belongs to the browser doing the watching, so it must not travel with a saved session
   * into a library item. Applied when a session starts or resumes.
   */
  consumerSessionRateLimit: "consumerSessionRateLimit",
  /**
   * Auto-pause the consumer session each time this many MORE messages have loaded. 0 = off.
   *
   * Purely client-side - the same Pause the toolbar button sends, triggered by the loaded
   * counter - and browser-wide for the same reason as the rate limit above. Re-arms on every
   * resume, so Play works as "load the next n".
   */
  consumerSessionPauseAfterLoaded: "consumerSessionPauseAfterLoaded",
  /** Whether the browser-wide consumer-session More tools panel is open. */
  consumerSessionToolsOpen: "consumerSessionToolsOpen",
  /** The last selected More tools tab. Runtime validation handles tabs removed by newer builds. */
  consumerSessionToolsTab: "consumerSessionToolsTab",
  /**
   * 'light' | 'dark' | 'system'. Also read by the boot script in server/src/main/resources/ui/index.ftl
   * (as JSON, the way use-local-storage-state writes it), so renaming the key needs a change there too.
   */
  theme: "theme"
} as const;
