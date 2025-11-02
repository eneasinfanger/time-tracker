const inline = require('web-resource-inliner');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const distPath = path.join(__dirname, 'dist/time-tracker/browser');
const indexPath = path.join(distPath, 'index.html');
const outputHtmlPath = path.join(distPath, 'index.html');

(async () => {
  try {
    const mainFile = path.join(distPath, '*.js');

    await esbuild.build({
      entryPoints: [mainFile],
      bundle: true,
      format: 'iife',
      platform: 'browser',
      outdir: distPath,
      allowOverwrite: true,
      sourcemap: false,
      minify: true
    });

    const html = fs.readFileSync(indexPath, 'utf8');

    inline.html(
      {
        fileContent: html,
        relativeTo: distPath
      },
      (err, inlinedHtml) => {
        if (err) {
          throw err;
        }

        const faviconRegex = /<link\b[^>]*\brel=["']icon["'][^>]*\btype=["']([^"']+)["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i;
        const match = inlinedHtml.match(faviconRegex);
        if (!match) {
          console.warn('No favicon link found in HTML.');
        } else {
          const mimeType = match[1];
          const imagePath = path.isAbsolute(match[2]) ? match[2] : path.join(distPath, match[2]);

          const imageBuffer = fs.readFileSync(imagePath);
          const base64Image = imageBuffer.toString('base64');
          const dataUri = `data:${ mimeType };base64,${ base64Image }`;

          inlinedHtml = inlinedHtml.replace(faviconRegex, `<link rel="icon" type="${ mimeType }" href="${ dataUri }">`);
        }

        fs.writeFileSync(outputHtmlPath, inlinedHtml, 'utf8');
        console.log(`All resources inlined → ${ outputHtmlPath }`);

        fs.readdirSync(distPath).forEach(file => {
          if (file !== 'index.html') {
            const fullPath = path.join(distPath, file);
            fs.rmSync(fullPath, { recursive: true, force: true });
          }
        });
      }
    );
  } catch (err) {
    console.error('Error inlining:', err);
  }
})();
