import * as m from "./resource-matchers"

export type LibraryContext = {
  contextFqn: string // Pulsar resource fqn like "persistent://a/b/c" for a topic, or "a" for a tenant.
}

export function mkDefaultResourceMatcher(contextFqn: string): m.ResourceMatcher {

}

