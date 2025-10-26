#!/usr/bin/env node

/**
 * 构建后处理脚本 - 自动添加 .js 后缀到 ES 模块导入
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function addJsExtensions(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");

  // 匹配相对导入，但不包含 .js 后缀的
  const importRegex = /import\s+.*?\s+from\s+["'](\.\/[^"']*?)["']/g;

  const newContent = content.replace(importRegex, (match, importPath) => {
    // 如果已经有扩展名，跳过
    if (path.extname(importPath)) {
      return match;
    }

    // 添加 .js 后缀
    return match.replace(importPath, importPath + ".js");
  });

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ 已处理: ${filePath}`);
  }
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith(".js")) {
      addJsExtensions(fullPath);
    }
  }
}

// 处理 dist 目录
const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  console.log("🔧 开始处理 ES 模块导入...");
  processDirectory(distPath);
  console.log("✅ 处理完成！");
} else {
  console.log("❌ dist 目录不存在");
}
