import {customTopicsNamesSort} from "./sorting";

describe("topicPageTopicsNamesSorting", () => {
  it("should correctly sort topics without partitions", () => {
    const topics = ["a", "c", "a-b", "d"];
    topics.sort(customTopicsNamesSort);
    expect(topics).toEqual(["a", "a-b", "c", "d"]);
  });

  it("should correctly sort topics with partitions", () => {
    const topics = ["a", "c", "a-b", "d", "a-partition-1", "a-partition-2", "a-partition-3"];
    topics.sort(customTopicsNamesSort);
    expect(topics).toEqual(["a", "a-partition-1", "a-partition-2", "a-partition-3", "a-b", "c", "d"]);
  });

  it('should handle base names with "-partition-" in them', () => {
    const topics = ['a-partition-test-partition-0', 'a-partition-test', 'a-partition-test-partition-1'];
    topics.sort(customTopicsNamesSort);
    expect(topics).toEqual(['a-partition-test', 'a-partition-test-partition-0', 'a-partition-test-partition-1']);
  });

  it('should handle mixed topics and partitions', () => {
    const topics = ['b', 'a-partition-0', 'c-partition-2', 'a', 'c-partition-0', 'b-partition-1', 'c', 'b-partition-0'];
    topics.sort(customTopicsNamesSort);
    expect(topics).toEqual(['a', 'a-partition-0', 'b', 'b-partition-0', 'b-partition-1', 'c', 'c-partition-0', 'c-partition-2']);
  });

  it('should handle topics with special characters', () => {
    const topics = ['!special', '@special', '!special-partition-0'];
    topics.sort(customTopicsNamesSort);
    expect(topics).toEqual(['!special', '!special-partition-0', '@special']);
  });

  it('should handle empty topics', () => {
    const topics = ['', 'a', ''];
    topics.sort(customTopicsNamesSort);
    expect(topics).toEqual(['', '', 'a']);
  });

  it('should handle topics with only partition', () => {
    const topics = ['partition-0', 'partition-1', 'partition-2'];
    topics.sort(customTopicsNamesSort);
    expect(topics).toEqual(['partition-0', 'partition-1', 'partition-2']);
  });
})