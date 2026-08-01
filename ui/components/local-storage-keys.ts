export const localStorageKeys = {
  messageExportConfig: "messageExportConfig",
  autoRefresh: "autoRefresh",
  defaultMessageFilterType: "defaultMessageFilterType",
  isHidePartitionedTopics: "isHidePartitionedTopics",
  /**
   * Whether the consumer session polls the per-topic debug view (the "Topic Positions" tab).
   *
   * DELIBERATELY NOT PART OF THE SESSION CONFIG. It is a property of this browser, not of the
   * session: saving it into a library item would carry one person's debugging preference to
   * everyone who later opened that session, and would make two otherwise identical sessions
   * compare as different.
   *
   * OFF BY DEFAULT because each refresh costs three admin round trips PER PARTITION.
   */
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
  consumerSessionPauseAfterLoaded: "consumerSessionPauseAfterLoaded"
} as const;
