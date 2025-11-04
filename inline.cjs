const inline = require('web-resource-inliner');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

(async () => {
  try {
    const distPath = path.join(__dirname, 'dist/time-tracker/browser');
    const indexPath = path.join(distPath, 'index.html');

    await bundleJs(distPath);

    const html = fs.readFileSync(indexPath, 'utf8');

    inlineImages(distPath, html, (err, inlinedHtml) => {
      if (err) { throw err; }

      inlinedHtml = inlineLinks(distPath, inlinedHtml);

      fs.writeFileSync(indexPath, inlinedHtml, 'utf8');
      console.log(`All resources inlined → ${ indexPath }`);

      removeOtherFiles(distPath, ['index.html']);
    });
  } catch (err) {
    console.error('Error inlining:', err);
  }
})();

async function bundleJs(distPath) {
  await esbuild.build({
    entryPoints: [path.join(distPath, '*.js')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outdir: distPath,
    allowOverwrite: true,
    sourcemap: false,
    minify: true
  });
}

function inlineImages(distPath, html, onComplete) {
  inline.html({ fileContent: html, relativeTo: distPath }, onComplete);
}

function inlineLinks(distPath, inlinedHtml) {
  const linkRegex = /<link\b(?=[^>]*\brel=["'][\w-]+["'])((?:(?!\btype=|\bhref=)[^>])*)(?:\btype=["']([^"']+)["'])?((?:(?!\bhref=)[^>])*)(?:\bhref=["']([^"']+)["'])?([^>]*)>/ig;

  return inlinedHtml.replaceAll(linkRegex, (match, attrBefore, type, attrBetween, href, attrAfter) => {
    const resourcePath = path.isAbsolute(href) ? href : path.join(distPath, href);

    if (!fs.existsSync(resourcePath) || !fs.statSync(resourcePath).isFile()) {
      console.warn(`Warning: Resource not found for inlining: ${ resourcePath }`);
      return match;
    }

    const fileBuffer = fs.readFileSync(resourcePath);
    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:${ type ?? '' };base64,${ base64Data }`;

    const padStart = s => ' ' + s.trim();
    const padEnd = s => s.trim() + ' ';
    return strBuilder()
      .append('<link ')
      .append(attrBefore, padEnd)
      .append(type, t => `type=${ t } `)
      .append(attrBetween, padEnd)
      .append(`href="${ dataUri }"`)
      .append(attrAfter, padStart)
      .append('>')
      .toString();
  });
}

function strBuilder() {
  return {
    data: '',
    append(s, f) {
      if (s) {
        if (f) { this.data += f(s); }
        else { this.data += s; }
      }
      return this;
    },
    toString() { return this.data; }
  };
}

function removeOtherFiles(distPath, excludes) {
  fs.readdirSync(distPath).forEach(file => {
    if (!excludes.includes(file)) {
      fs.rmSync(path.join(distPath, file), { recursive: true, force: true });
    }
  });
}
