/**
 * DATA TRANSFER OBJECT (DTO)
 *
 * An object that carries data between processes in order to reduce
 * the number of method calls.
 *
 * Characteristics:
 * - Pure data container (no behavior)
 * - Optimized for transfer, not domain logic
 * - Decouples internal domain from external API
 * - Can combine data from multiple domain objects
 */

// Domain Objects (internal representation)
class User {
  constructor(
    public readonly id: string,
    public username: string,
    public email: string,
    public passwordHash: string, // Sensitive - should never be in DTO
    public createdAt: Date,
    public lastLoginAt: Date | null,
    public isActive: boolean,
    public role: "admin" | "user" | "guest"
  ) {}

  isAdmin(): boolean {
    return this.role === "admin";
  }

  daysSinceCreation(): number {
    return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  }
}

class UserProfile {
  constructor(
    public readonly userId: string,
    public firstName: string,
    public lastName: string,
    public bio: string,
    public avatarUrl: string
  ) {}

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

// DTOs - data transfer objects for API responses

// Basic user info for lists
interface UserListItemDTO {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
}

// Detailed user info for profile page
interface UserDetailDTO {
  id: string;
  username: string;
  email: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  memberSince: string;
  isActive: boolean;
}

// User info for admin dashboard
interface UserAdminDTO {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  daysSinceCreation: number;
}

// DTO for creating a new user
interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// DTO for updating user
interface UpdateUserDTO {
  email?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
}

// ASSEMBLERS - convert between domain objects and DTOs
class UserDTOAssembler {
  // Domain -> DTO (for responses)
  static toListItem(user: User, profile: UserProfile): UserListItemDTO {
    return {
      id: user.id,
      username: user.username,
      fullName: profile.getFullName(),
      avatarUrl: profile.avatarUrl,
    };
  }

  static toDetail(user: User, profile: UserProfile): UserDetailDTO {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: profile.getFullName(),
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      memberSince: user.createdAt.toISOString().split("T")[0],
      isActive: user.isActive,
    };
  }

  static toAdmin(user: User): UserAdminDTO {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      daysSinceCreation: user.daysSinceCreation(),
    };
  }

  // DTO -> Domain (for requests)
  static fromCreateDTO(dto: CreateUserDTO): { user: User; profile: UserProfile } {
    const id = `user-${Date.now()}`;
    const user = new User(
      id,
      dto.username,
      dto.email,
      `hash_${dto.password}`, // Would use bcrypt in real app
      new Date(),
      null,
      true,
      "user"
    );
    const profile = new UserProfile(id, dto.firstName, dto.lastName, "", "/avatars/default.png");
    return { user, profile };
  }
}

// Simulated data
const users = new Map<string, User>([
  [
    "u1",
    new User(
      "u1",
      "alice_dev",
      "alice@example.com",
      "hash_secret123",
      new Date("2023-01-15"),
      new Date("2024-01-20"),
      true,
      "admin"
    ),
  ],
  [
    "u2",
    new User(
      "u2",
      "bob_code",
      "bob@example.com",
      "hash_password456",
      new Date("2023-06-20"),
      new Date("2024-01-19"),
      true,
      "user"
    ),
  ],
]);

const profiles = new Map<string, UserProfile>([
  ["u1", new UserProfile("u1", "Alice", "Smith", "Full-stack developer", "/avatars/alice.jpg")],
  ["u2", new UserProfile("u2", "Bob", "Johnson", "Backend engineer", "/avatars/bob.jpg")],
]);

// API Service using DTOs
class UserService {
  // List users - returns minimal data
  listUsers(): UserListItemDTO[] {
    const result: UserListItemDTO[] = [];
    for (const [id, user] of Array.from(users)) {
      const profile = profiles.get(id)!;
      result.push(UserDTOAssembler.toListItem(user, profile));
    }
    return result;
  }

  // Get user detail - returns public info
  getUserDetail(id: string): UserDetailDTO | null {
    const user = users.get(id);
    const profile = profiles.get(id);
    if (!user || !profile) return null;
    return UserDTOAssembler.toDetail(user, profile);
  }

  // Admin view - returns everything except sensitive data
  getUserAdmin(id: string): UserAdminDTO | null {
    const user = users.get(id);
    if (!user) return null;
    return UserDTOAssembler.toAdmin(user);
  }

  // Create user from DTO
  createUser(dto: CreateUserDTO): UserDetailDTO {
    const { user, profile } = UserDTOAssembler.fromCreateDTO(dto);
    users.set(user.id, user);
    profiles.set(user.id, profile);
    return UserDTOAssembler.toDetail(user, profile);
  }
}

// Usage
console.log("=== Data Transfer Object Pattern ===\n");

const service = new UserService();

// List view - minimal data
console.log("User List (minimal DTO):");
console.log(JSON.stringify(service.listUsers(), null, 2));

// Detail view - public info only
console.log("\nUser Detail (public DTO):");
console.log(JSON.stringify(service.getUserDetail("u1"), null, 2));

// Admin view - more info but still no password
console.log("\nAdmin View (admin DTO):");
console.log(JSON.stringify(service.getUserAdmin("u1"), null, 2));

// Create user
console.log("\nCreate User (from DTO):");
const newUser = service.createUser({
  username: "charlie_new",
  email: "charlie@example.com",
  password: "newpassword",
  firstName: "Charlie",
  lastName: "Brown",
});
console.log(JSON.stringify(newUser, null, 2));

// Make this file a module to avoid global scope pollution
export {};
