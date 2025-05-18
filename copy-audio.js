const fs = require('fs');
const path = require('path');

// 确保目标目录存在
const targetDir = path.resolve(__dirname, 'dist/assets');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 只复制WAV文件（点击音效），不复制MP3文件（背景音乐）
const sourceDir = path.resolve(__dirname, 'audio');
fs.readdirSync(sourceDir).forEach(file => {
  if (file.endsWith('.wav')) {
    fs.copyFileSync(
      path.join(sourceDir, file),
      path.join(targetDir, file)
    );
    console.log(`已复制: ${file}`);
  }
});

console.log('音效文件复制完成！');
