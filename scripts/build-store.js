#!/usr/bin/env node

/**
 * Build Store Script
 * 自动扫描 JS 文件并生成 store.json 和脚本文档
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  // 扫描的目录（相对于项目根目录）
  scanDirs: ['message', 'scripts'],
  // 输出文件
  outputFile: 'store.json',
  // GitHub 仓库 URL
  repoUrl: 'https://github.com/dompling/TrollScript-Store',
  // GitHub 原始文件 URL 前缀
  baseUrl: 'https://raw.githubusercontent.com/dompling/TrollScript-Store/main',
  // 作者信息
  author: {
    name: 'dompling',
    avatar: 'https://avatars.githubusercontent.com/u/23498579?v=4'
  }
};

/**
 * 解析 JS 文件头部的元数据注释
 * @param {string} content - 文件内容
 * @returns {object|null} - 解析后的元数据对象
 */
function parseMetadata(content) {
  // 匹配 /* ... */ 格式的注释块
  const commentMatch = content.match(/^\/\*[\s\S]*?\*\//);
  if (!commentMatch) {
    return null;
  }

  const commentBlock = commentMatch[0];
  const metadata = {};

  // 解析每一行的 key: value 格式
  const lines = commentBlock.split('\n');
  for (const line of lines) {
    const trimmed = line.replace(/^[\s\*\/]+/, '').trim();
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      if (key && value) {
        metadata[key] = value;
      }
    }
  }

  // 验证必需字段
  const requiredFields = ['id', 'name', 'description', 'icon', 'category', 'version'];
  for (const field of requiredFields) {
    if (!metadata[field]) {
      return null;
    }
  }

  return metadata;
}

/**
 * 获取文件大小
 * @param {string} filePath - 文件路径
 * @returns {number} - 文件大小（字节）
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * 递归扫描目录获取所有 JS 文件
 * @param {string} dir - 目录路径
 * @returns {string[]} - JS 文件路径数组
 */
function scanJsFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * 生成目录的 README.md
 * @param {string} dirPath - 目录路径
 * @param {string} dirName - 目录名称
 * @param {Array} scripts - 该目录下的脚本列表
 */
function generateDirReadme(dirPath, dirName, scripts) {
  if (scripts.length === 0) {
    return;
  }

  const readmePath = path.join(dirPath, 'README.md');

  let content = `# ${dirName} 脚本\n\n`;
  content += `此目录包含 ${scripts.length} 个脚本。\n\n`;
  content += `## 脚本列表\n\n`;
  content += `| 脚本 | 描述 | 版本 | 分类 |\n`;
  content += `|------|------|------|------|\n`;

  for (const script of scripts) {
    const fileName = path.basename(script.filePath);
    content += `| [${script.name}](./${fileName}) | ${script.description} | \`${script.version}\` | ${script.category} |\n`;
  }

  content += `\n---\n\n`;
  content += `> 此文件由构建脚本自动生成，请勿手动编辑。\n`;

  fs.writeFileSync(readmePath, content, 'utf-8');
  console.log(`📄 生成 ${dirName}/README.md`);
}

/**
 * 更新主 README.md 的脚本列表
 * @param {string} rootDir - 项目根目录
 * @param {Array} allScripts - 所有脚本列表
 */
function updateMainReadme(rootDir, allScripts) {
  const readmePath = path.join(rootDir, 'README.md');

  if (!fs.existsSync(readmePath)) {
    console.log('⚠️  主 README.md 不存在，跳过更新');
    return;
  }

  let content = fs.readFileSync(readmePath, 'utf-8');

  // 生成脚本列表表格
  let tableContent = `| 脚本 | 描述 | 版本 | 文档 |\n`;
  tableContent += `|------|------|------|------|\n`;

  for (const script of allScripts) {
    const dirName = path.dirname(script.relativePath);
    const docLink = `[📖](./${dirName}/README.md)`;
    tableContent += `| **${script.name}** | ${script.description} | \`${script.version}\` | ${docLink} |\n`;
  }

  // 替换 SCRIPTS_START 和 SCRIPTS_END 之间的内容
  const startMarker = '<!-- SCRIPTS_START -->';
  const endMarker = '<!-- SCRIPTS_END -->';

  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex !== -1 && endIndex !== -1) {
    content = content.substring(0, startIndex + startMarker.length) +
      '\n' + tableContent +
      content.substring(endIndex);

    fs.writeFileSync(readmePath, content, 'utf-8');
    console.log('📄 更新主 README.md 脚本列表');
  } else {
    console.log('⚠️  主 README.md 中未找到 SCRIPTS 标记，跳过更新');
  }
}

/**
 * 主函数
 */
function main() {
  const rootDir = path.resolve(__dirname, '..');
  const scripts = [];
  const categories = new Set();
  const scriptsByDir = {};

  console.log('🔍 扫描 JS 文件...\n');

  // 扫描所有配置的目录
  for (const scanDir of CONFIG.scanDirs) {
    const dirPath = path.join(rootDir, scanDir);
    const jsFiles = scanJsFiles(dirPath);

    if (!scriptsByDir[scanDir]) {
      scriptsByDir[scanDir] = [];
    }

    for (const filePath of jsFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const metadata = parseMetadata(content);

      if (metadata) {
        // 计算相对路径用于 URL
        const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
        const downloadUrl = `${CONFIG.baseUrl}/${relativePath}`;
        const fileSize = getFileSize(filePath);
        const now = new Date().toISOString();

        // 尝试读取现有的 store.json 获取 downloads 和 createdAt
        let existingScript = null;
        const existingStorePath = path.join(rootDir, CONFIG.outputFile);
        if (fs.existsSync(existingStorePath)) {
          try {
            const existingStore = JSON.parse(fs.readFileSync(existingStorePath, 'utf-8'));
            const existingScripts = existingStore.authors?.[0]?.scripts || [];
            existingScript = existingScripts.find(s => s.id === metadata.id);
          } catch (e) {
            // 忽略解析错误
          }
        }

        const scriptEntry = {
          id: metadata.id,
          name: metadata.name,
          description: metadata.description,
          icon: metadata.icon,
          category: metadata.category,
          version: metadata.version,
          downloadUrl,
          size: fileSize,
          downloads: existingScript?.downloads || 0,
          createdAt: existingScript?.createdAt || now,
          updatedAt: now,
          // 内部使用的额外字段
          filePath,
          relativePath
        };

        scripts.push(scriptEntry);
        scriptsByDir[scanDir].push(scriptEntry);
        categories.add(metadata.category);

        console.log(`✅ ${metadata.name} (${metadata.id})`);
        console.log(`   📁 ${relativePath}`);
        console.log(`   📦 ${fileSize} bytes\n`);
      } else {
        const relativePath = path.relative(rootDir, filePath);
        console.log(`⚠️  跳过 ${relativePath} (缺少有效的元数据注释)\n`);
      }
    }
  }

  if (scripts.length === 0) {
    console.log('❌ 未找到任何有效的脚本文件');
    process.exit(1);
  }

  // 生成各目录的 README.md
  console.log('\n📝 生成目录文档...\n');
  for (const [dirName, dirScripts] of Object.entries(scriptsByDir)) {
    if (dirScripts.length > 0) {
      const dirPath = path.join(rootDir, dirName);
      generateDirReadme(dirPath, dirName, dirScripts);
    }
  }

  // 更新主 README.md
  console.log('\n📝 更新主文档...\n');
  updateMainReadme(rootDir, scripts);

  // 生成 store.json（移除内部字段）
  const cleanScripts = scripts.map(({ filePath, relativePath, ...rest }) => rest);

  const store = {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    categories: Array.from(categories).sort(),
    authors: [
      {
        name: CONFIG.author.name,
        avatar: CONFIG.author.avatar,
        scripts: cleanScripts.sort((a, b) => a.name.localeCompare(b.name))
      }
    ]
  };

  const outputPath = path.join(rootDir, CONFIG.outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(store, null, 2), 'utf-8');

  console.log('\n' + '─'.repeat(50));
  console.log(`\n🎉 构建完成！`);
  console.log(`   📝 共 ${scripts.length} 个脚本`);
  console.log(`   📂 分类: ${Array.from(categories).join(', ')}`);
  console.log(`   📄 生成 ${CONFIG.outputFile}`);
  console.log(`   📄 生成 ${Object.keys(scriptsByDir).filter(d => scriptsByDir[d].length > 0).length} 个目录文档\n`);
}

// 执行
main();
