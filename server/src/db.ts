import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { JSONFilePreset } from "lowdb/node";
import { User, DbSchema } from "./types";
import { hashPassword } from "./auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");
const dbFile = path.join(dataDir, "db.json");
const defaultDbFile = path.join(dataDir, "db_default.json");

export async function createDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 检查是否存在默认数据文件
  let defaultData: DbSchema;
  const ADMIN_USER_ID = "admin-001";
  const ADMIN_USERNAME = "admin";
  const DEFAULT_ADMIN_PASSWORD_RAW = "admin123456";
  const DEFAULT_AVATAR_PATH = "/upload/avatar/default_avatar.png";

  if (fs.existsSync(defaultDbFile)) {
    // 从默认数据文件加载
    console.log("Loading default data from db_default.json");
    const defaultDataContent = fs.readFileSync(defaultDbFile, "utf-8");
    defaultData = JSON.parse(defaultDataContent);

    // 确保管理员密码是加密的
    const adminUser = defaultData.users.find(u => u.id === ADMIN_USER_ID);
    if (adminUser) {
      // 检查密码是否已经是 bcrypt 哈希格式（以 $2b$ 或 $2a$ 开头）
      const isHashedFormat =
        adminUser.password.startsWith("$2b$") ||
        adminUser.password.startsWith("$2a$");

      let needRehash = false;

      // 如果密码不是哈希格式，或者是明文的默认密码，则需要重新哈希
      if (
        !isHashedFormat ||
        adminUser.password === DEFAULT_ADMIN_PASSWORD_RAW
      ) {
        needRehash = true;
      } else {
        // 如果是哈希格式，验证它是否与默认密码匹配
        try {
          const { comparePassword } = await import("./auth.js");
          const isValid = await comparePassword(
            DEFAULT_ADMIN_PASSWORD_RAW,
            adminUser.password
          );
          if (!isValid) {
            needRehash = true;
          }
        } catch (error) {
          // 如果验证失败，也重新哈希
          needRehash = true;
        }
      }

      if (needRehash) {
        console.log("Rehashing admin password");
        adminUser.password = await hashPassword(DEFAULT_ADMIN_PASSWORD_RAW);
      }
    }
  } else {
    // 创建默认数据
    console.log("Creating default data");
    const defaultAdminPassword = await hashPassword(DEFAULT_ADMIN_PASSWORD_RAW);
    const defaultAdmin: User = {
      id: ADMIN_USER_ID,
      username: ADMIN_USERNAME,
      password: defaultAdminPassword,
      avatar: DEFAULT_AVATAR_PATH,
      email: "",
      phone: "",
      createdAt: new Date().toISOString()
    };

    defaultData = {
      subscriptions: [],
      settings: {},
      users: [defaultAdmin]
    };
  }

  // 如果数据库文件不存在，使用默认数据初始化
  if (!fs.existsSync(dbFile)) {
    console.log("Initializing database with default data");
    const db = await JSONFilePreset<DbSchema>(dbFile, defaultData);
    return db;
  }

  // 如果数据库文件存在，直接加载
  const db = await JSONFilePreset<DbSchema>(dbFile, defaultData);
  return db;
}
