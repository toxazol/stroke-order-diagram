(async function() {
  const fs = require('fs')
  const path = require('path')
  const args = require('minimist')(process.argv.slice(2), {
    alias: {
      dir: ['d'], kanji: ['k']
    },
    default: {
      dir: 'downloaded'
    }
  });
  console.log(args);
  
  if (!args.kanji) {
    console.log('You must specify a kanji to download using --kanji=<kanji[,anotherKanji]>')
    process.exit(1)
  }
  
  const k = args.kanji;

  for (let k of args.kanji.split(',')) {
    if (!k) {
      continue;
    }
    const diagramGenerator = require('./tsurukame-stroke-order.js')
  
    const codePoint = k && k.codePointAt(0).toString(16).padStart(5, '0');
    const downloadName = path.join(args.dir, `${codePoint}.svg`);
    
    console.log(`downloading ${k} to ${downloadName}`)
  
    const svgData = await diagramGenerator(k);
  
    fs.writeFileSync(path.resolve(downloadName), svgData);
  }

  console.log('DUNZO!')
  process.exit(0);
})();
