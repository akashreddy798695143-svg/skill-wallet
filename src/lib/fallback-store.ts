type FallbackUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "USER" | "ADMIN";
  createdAt: Date;
  updatedAt: Date;
};

type FallbackLoginEntry = {
  id: string;
  userId: string | null;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  createdAt: Date;
};

type FallbackStore = {
  users: Map<string, FallbackUser>;
  loginHistory: FallbackLoginEntry[];
};

const globalStore = globalThis as typeof globalThis & {
  __vbcFallbackStore?: FallbackStore;
};

function getStore(): FallbackStore {
  if (!globalStore.__vbcFallbackStore) {
    globalStore.__vbcFallbackStore = {
      users: new Map(),
      loginHistory: [],
    };
  }
  return globalStore.__vbcFallbackStore;
}

export async function findFallbackUserByEmail(email: string): Promise<FallbackUser | null> {
  const store = getStore();
  const match = Array.from(store.users.values()).find((u) => u.email === email);
  return match ?? null;
}

export async function findFallbackUserById(id: string): Promise<FallbackUser | null> {
  return getStore().users.get(id) ?? null;
}

export async function createFallbackUser(input: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "USER" | "ADMIN";
}): Promise<FallbackUser> {
  const now = new Date();
  const user: FallbackUser = {
    id: input.id,
    email: input.email,
    name: input.name,
    passwordHash: input.passwordHash,
    role: input.role,
    createdAt: now,
    updatedAt: now,
  };
  getStore().users.set(user.id, user);
  return user;
}

export async function countFallbackUsers(): Promise<number> {
  return getStore().users.size;
}

export async function createFallbackLoginEntry(input: {
  userId: string | null;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
}): Promise<FallbackLoginEntry> {
  const entry: FallbackLoginEntry = {
    id: `login-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    email: input.email,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    success: input.success,
    createdAt: new Date(),
  };
  getStore().loginHistory.push(entry);
  return entry;
}
