/**
 * Test Data Factories
 *
 * Provides reusable test data generators using @faker-js/faker.
 * All factories generate unique, parallel-safe test data.
 */

import { faker } from "@faker-js/faker";

/**
 * User factory for auth-related tests
 */
export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    createdAt: faker.date.past(),
    ...overrides,
  };
}

/**
 * Session factory for chat/conversation tests
 */
export function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence({ min: 3, max: 6 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    privacyMode: faker.helpers.arrayElement([
      "local-only",
      "trusted-network",
      "cloud-enhanced",
    ] as const),
    ...overrides,
  };
}

/**
 * Message factory for chat messages
 */
export function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: faker.string.uuid(),
    content: faker.lorem.paragraph(),
    role: faker.helpers.arrayElement(["user", "assistant"] as const),
    createdAt: faker.date.recent(),
    ...overrides,
  };
}

/**
 * Create multiple items using a factory
 */
export function createMany<T>(
  factoryFn: (partial?: Partial<T>) => T,
  count: number,
  overrides: Partial<T> = {}
): T[] {
  return Array.from({ length: count }, () => factoryFn(overrides));
}

// Type definitions for factory outputs
export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
};

export type Session = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  privacyMode: "local-only" | "trusted-network" | "cloud-enhanced";
};

export type Message = {
  id: string;
  content: string;
  role: "user" | "assistant";
  createdAt: Date;
};
