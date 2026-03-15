/**
 * Design Twitter
 * Difficulty: Medium
 *
 * Design a simplified version of Twitter where users can post tweets,
 * follow/unfollow another user, and is able to see the 10 most recent tweets
 * in the user's news feed.
 *
 * Implement the Twitter class:
 * - Twitter() Initializes your twitter object.
 * - void postTweet(int userId, int tweetId) Composes a new tweet with ID
 *   tweetId by the user userId. Each call to this function will be made with
 *   a unique tweetId.
 * - List<Integer> getNewsFeed(int userId) Retrieves the 10 most recent tweet
 *   IDs in the user's news feed. Each item in the news feed must be posted by
 *   users who the user followed or by the user themself. Tweets must be ordered
 *   from most recent to least recent.
 * - void follow(int followerId, int followeeId) The user with ID followerId
 *   started following the user with ID followeeId.
 * - void unfollow(int followerId, int followeeId) The user with ID followerId
 *   started unfollowing the user with ID followeeId.
 *
 * Example 1:
 * Input:
 * ["Twitter", "postTweet", "getNewsFeed", "follow", "getNewsFeed", "unfollow", "getNewsFeed"]
 * [[], [1, 5], [1], [1, 2], [1], [1, 2], [1]]
 * Output:
 * [null, null, [5], null, [5, 6], null, [5]]
 *
 * Explanation:
 * Twitter twitter = new Twitter();
 * twitter.postTweet(1, 5); // User 1 posts a new tweet (id = 5).
 * twitter.getNewsFeed(1);  // User 1's news feed should return a list with 1
 *                          // tweet id -> [5]. return [5]
 * twitter.follow(1, 2);    // User 1 follows user 2.
 * twitter.postTweet(2, 6); // User 2 posts a new tweet (id = 6).
 * twitter.getNewsFeed(1);  // User 1's news feed should return a list with 2
 *                          // tweet ids -> [6, 5]. Tweet id 6 should precede
 *                          // tweet id 5 because it is posted after tweet id 5.
 * twitter.unfollow(1, 2);  // User 1 unfollows user 2.
 * twitter.getNewsFeed(1);  // User 1's news feed should return a list with 1
 *                          // tweet id -> [5], since user 1 is no longer
 *                          // following user 2.
 *
 * Constraints:
 * - 1 <= userId, followerId, followeeId <= 500
 * - 0 <= tweetId <= 10^4
 * - All the tweets have unique IDs.
 * - At most 3 * 10^4 calls will be made to postTweet, getNewsFeed, follow,
 *   and unfollow.
 */

/**
 * Tweet class to store tweet data
 */
interface Tweet {
  tweetId: number;
  timestamp: number;
}

/**
 * Max Heap for merging k sorted tweet lists
 * Stores [timestamp, tweetId, userId, tweetIndex]
 */
class TweetHeap {
  private heap: [number, number, number, number][] = [];

  get size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  push(timestamp: number, tweetId: number, userId: number, index: number): void {
    this.heap.push([timestamp, tweetId, userId, index]);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): [number, number, number, number] | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const max = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return max;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex][0] >= this.heap[index][0]) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let largest = index;

      if (leftChild < length && this.heap[leftChild][0] > this.heap[largest][0]) {
        largest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild][0] > this.heap[largest][0]) {
        largest = rightChild;
      }

      if (largest === index) break;
      [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
      index = largest;
    }
  }
}

/**
 * Twitter - Heap-based News Feed
 *
 * Data Structures:
 * - userTweets: Map<userId, Tweet[]> - tweets by each user (newest last)
 * - followers: Map<userId, Set<followeeId>> - who each user follows
 *
 * Time Complexity:
 * - postTweet: O(1)
 * - follow/unfollow: O(1)
 * - getNewsFeed: O(k log k) where k = number of users in feed
 *
 * Key Insight:
 * getNewsFeed is like merging k sorted lists (each user's tweets).
 * Use a max heap to efficiently get top 10 most recent tweets.
 */
class Twitter {
  private userTweets: Map<number, Tweet[]>;
  private followers: Map<number, Set<number>>;
  private timestamp: number;

  constructor() {
    this.userTweets = new Map();
    this.followers = new Map();
    this.timestamp = 0;
  }

  postTweet(userId: number, tweetId: number): void {
    if (!this.userTweets.has(userId)) {
      this.userTweets.set(userId, []);
    }
    this.userTweets.get(userId)!.push({
      tweetId,
      timestamp: this.timestamp++,
    });
  }

  getNewsFeed(userId: number): number[] {
    const heap = new TweetHeap();
    const result: number[] = [];

    // Get all users whose tweets should appear in feed
    const feedUsers = new Set<number>([userId]);
    const following = this.followers.get(userId);
    if (following) {
      for (const followeeId of following) {
        feedUsers.add(followeeId);
      }
    }

    // Initialize heap with most recent tweet from each user
    for (const uid of feedUsers) {
      const tweets = this.userTweets.get(uid);
      if (tweets && tweets.length > 0) {
        const lastIndex = tweets.length - 1;
        const tweet = tweets[lastIndex];
        heap.push(tweet.timestamp, tweet.tweetId, uid, lastIndex);
      }
    }

    // Extract top 10 tweets using heap
    while (!heap.isEmpty() && result.length < 10) {
      const [_, tweetId, uid, index] = heap.pop()!;
      result.push(tweetId);

      // Add next older tweet from same user
      if (index > 0) {
        const tweets = this.userTweets.get(uid)!;
        const prevTweet = tweets[index - 1];
        heap.push(prevTweet.timestamp, prevTweet.tweetId, uid, index - 1);
      }
    }

    return result;
  }

  follow(followerId: number, followeeId: number): void {
    if (followerId === followeeId) return; // Can't follow yourself

    if (!this.followers.has(followerId)) {
      this.followers.set(followerId, new Set());
    }
    this.followers.get(followerId)!.add(followeeId);
  }

  unfollow(followerId: number, followeeId: number): void {
    const following = this.followers.get(followerId);
    if (following) {
      following.delete(followeeId);
    }
  }
}

/**
 * Alternative: Simple Sort Approach
 *
 * Less efficient but simpler implementation.
 * Collects all relevant tweets and sorts them.
 */
class TwitterSimple {
  private userTweets: Map<number, Tweet[]>;
  private followers: Map<number, Set<number>>;
  private timestamp: number;

  constructor() {
    this.userTweets = new Map();
    this.followers = new Map();
    this.timestamp = 0;
  }

  postTweet(userId: number, tweetId: number): void {
    if (!this.userTweets.has(userId)) {
      this.userTweets.set(userId, []);
    }
    this.userTweets.get(userId)!.push({
      tweetId,
      timestamp: this.timestamp++,
    });
  }

  getNewsFeed(userId: number): number[] {
    const allTweets: Tweet[] = [];

    // Collect user's own tweets
    const ownTweets = this.userTweets.get(userId) || [];
    allTweets.push(...ownTweets);

    // Collect followed users' tweets
    const following = this.followers.get(userId) || new Set();
    for (const followeeId of following) {
      const followeeTweets = this.userTweets.get(followeeId) || [];
      allTweets.push(...followeeTweets);
    }

    // Sort by timestamp descending and take top 10
    return allTweets
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map((tweet) => tweet.tweetId);
  }

  follow(followerId: number, followeeId: number): void {
    if (followerId === followeeId) return;

    if (!this.followers.has(followerId)) {
      this.followers.set(followerId, new Set());
    }
    this.followers.get(followerId)!.add(followeeId);
  }

  unfollow(followerId: number, followeeId: number): void {
    const following = this.followers.get(followerId);
    if (following) {
      following.delete(followeeId);
    }
  }
}

// ============ Test Cases ============
console.log("==========================================");
console.log("Design Twitter");
console.log("==========================================");

// Test case 1: Example from problem
const twitter1 = new Twitter();
twitter1.postTweet(1, 5);
console.log(twitter1.getNewsFeed(1)); // [5]
twitter1.follow(1, 2);
twitter1.postTweet(2, 6);
console.log(twitter1.getNewsFeed(1)); // [6, 5]
twitter1.unfollow(1, 2);
console.log(twitter1.getNewsFeed(1)); // [5]

console.log("\n--- Test case 2: Multiple followers ---");
const twitter2 = new Twitter();
twitter2.postTweet(1, 1);
twitter2.postTweet(2, 2);
twitter2.postTweet(3, 3);
twitter2.follow(1, 2);
twitter2.follow(1, 3);
console.log(twitter2.getNewsFeed(1)); // [3, 2, 1]

console.log("\n--- Test case 3: More than 10 tweets ---");
const twitter3 = new Twitter();
for (let i = 1; i <= 15; i++) {
  twitter3.postTweet(1, i);
}
console.log(twitter3.getNewsFeed(1)); // [15, 14, 13, 12, 11, 10, 9, 8, 7, 6]

console.log("\n--- Test case 4: Follow self (should not affect) ---");
const twitter4 = new Twitter();
twitter4.postTweet(1, 100);
twitter4.follow(1, 1);
console.log(twitter4.getNewsFeed(1)); // [100]

console.log("\n--- Simple Approach ---");
const twitterSimple = new TwitterSimple();
twitterSimple.postTweet(1, 5);
console.log(twitterSimple.getNewsFeed(1)); // [5]
twitterSimple.follow(1, 2);
twitterSimple.postTweet(2, 6);
console.log(twitterSimple.getNewsFeed(1)); // [6, 5]

export {}
