import fs from "fs";
import path from "path";

// Simple script to convert ESM dist files to CommonJS
// This creates .cjs versions alongside .js files
const distDir = path.join(process.cwd(), "dist");

function convertToCommonJS(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      convertToCommonJS(fullPath);
    } else if (file.endsWith(".js")) {
      const content = fs.readFileSync(fullPath, "utf-8");

      // Create .cjs version
      const cjsPath = fullPath.replace(/\.js$/, ".cjs");
      const cjsContent = content
        .replace(/import\s+{([^}]+)}\s+from\s+["'](.+?)["']/g, (match, imports, source) => {
          const sourceWithExt = source.endsWith(".js") ? source : source + ".js";
          return `const { ${imports} } = require("${sourceWithExt}")`;
        })
        .replace(/import\s+(\w+)\s+from\s+["'](.+?)["']/g, (match, name, source) => {
          const sourceWithExt = source.endsWith(".js") ? source : source + ".js";
          return `const ${name} = require("${sourceWithExt}")`;
        })
        .replace(/export\s+{([^}]+)}/g, "module.exports = { $1 }")
        .replace(/export\s+default\s+/g, "module.exports = ")
        .replace(/export\s+const\s+/g, "const ")
        .replace(/export\s+function\s+/g, "function ")
        .replace(/export\s+class\s+/g, "class ");

      // Add module.exports at the end if not present
      if (!cjsContent.includes("module.exports")) {
        const lines = cjsContent.trim().split("\n");
        const lastLine = lines[lines.length - 1];
        if (!lastLine.startsWith("module.exports")) {
          fs.writeFileSync(cjsPath, cjsContent);
        } else {
          fs.writeFileSync(cjsPath, cjsContent);
        }
      } else {
        fs.writeFileSync(cjsPath, cjsContent);
      }
    }
  }
}

console.log("Building CommonJS versions...");
if (fs.existsSync(distDir)) {
  convertToCommonJS(distDir);
  console.log("✓ CommonJS build complete");
} else {
  console.log("dist/ directory not found. Run tsc first.");
}
