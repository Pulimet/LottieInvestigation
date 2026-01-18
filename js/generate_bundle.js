const fs = require('fs');
const path = require('path');

const jsonDir = path.join(__dirname, '../json');
const bundlePath = path.join(__dirname, 'files_bundle.js');

try {
    const files = fs.readdirSync(jsonDir);
    const bundle = {};

    console.log(`Scanning ${jsonDir}...`);

    files.forEach(file => {
        if (file.toLowerCase().endsWith('.json')) {
            const filePath = path.join(jsonDir, file);
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                // parse to ensure valid JSON (and maybe minify)
                const jsonContent = JSON.parse(content);
                bundle[file] = jsonContent;
                console.log(`  Included: ${file}`);
            } catch (err) {
                console.error(`  Error reading ${file}: ${err.message}`);
            }
        }
    });

    const fileContent = `window.LOTTIE_FILES = ${JSON.stringify(bundle, null, 2)};`;

    fs.writeFileSync(bundlePath, fileContent);
    console.log(`\nSuccessfully created bundle at ${bundlePath}`);
    console.log(`Total files: ${Object.keys(bundle).length}`);

} catch (err) {
    console.error('Error generating bundle:', err);
}
