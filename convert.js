var showdown  = require('showdown');
var fs        = require('fs');
const path    = require('path'); // ADDED 'path' module for better file path handling

let inputFilePath   = process.argv[2];       // Path to the input file, e.g. '../my-docs/guide.md'
let pageTitle       = process.argv[3] || ''; // If title is not specified, it will be empty
let plausibleDomain = process.argv[3] || ''; // IF domain is not specified, it will be empty

// ADDED check for inputFilePath
// If the input file path is not provided, we log an error and exit the script
// This prevents the script from running without a valid input file
// This is important to ensure that the script has a valid file to process
if (!inputFilePath) {
  console.error("ERROR: You must provide the path to the input Markdown file as the first argument.");
  console.error("\tUSE: node convert.js <inputFilePath> [pageTitle] [plausibleDomain]");
  process.exit(1); // Exit the script with an error code
}

var hljs = require ('highlight.js');

showdown.extension('highlight', function () {
  function htmlunencode(text) {
    return (
      text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
      );
  }
  return [{
    type: "output",
    filter: function (text, converter, options) {
      var left = "<pre><code\\b[^>]*>",
          right = "</code></pre>",
          flags = "g";
      var replacement = function (wholeMatch, match, left, right) {
        match = htmlunencode(match);
        var lang = (left.match(/class=\"([^ \"]+)/) || [])[1];
        left = left.slice(0, 18) + 'hljs ' + left.slice(18);
        if (lang && hljs.getLanguage(lang)) {
          return left + hljs.highlight(match, {language: lang}).value + right;
        } else {
          return left + hljs.highlightAuto(match).value + right;
        }
      };
      return showdown.helper.replaceRecursiveRegExp(text, replacement, left, right, flags);
    }
  }];
});

// PATH: Read the CSS files for styling
fs.readFile(__dirname + '/style.css', function (err, styleData) {
  fs.readFile(__dirname + '/node_modules/highlight.js/styles/atom-one-dark.css', function(err, highlightingStyles) {
    // READING the input file
    fs.readFile(inputFilePath, function (err, data) {
      if (err) {
        console.error("ERROR: Cannot read file:", inputFilePath);
        throw err; 
      }
      let text = data.toString();

      converter = new showdown.Converter({
        ghCompatibleHeaderId: true,
        simpleLineBreaks: true,
        ghMentions: true,
        extensions: ['highlight'],
        tables: true
      });

      var preContent = `
      <html>
        <head>
          <title>` + pageTitle + `</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta charset="UTF-8">`

      if (plausibleDomain.length > 0) {
        preContent += `
          <script defer data-domain="` + plausibleDomain + `" src="https://plausible.io/js/script.js"></script>
        `
      }
      preContent += `
        </head>
        <body>
          <div id='content'>
      `

      let postContent = `

          </div>
          <style type='text/css'>` + styleData + `</style>
          <style type='text/css'>` + highlightingStyles + `</style>
        </body>
      </html>`;

      html = preContent + converter.makeHtml(text) + postContent

      converter.setFlavor('github');

      // CHANGE: Save the output HTML file in the current working directory
      // 1. Get the input file name without the extension
      const inputFileName = path.basename(inputFilePath, '.md'); 
      // 2. Create the output file name by appending ".html" to the input file name
      const outputFileName = inputFileName + ".html";
      // 3. Makig  the final output path by joining the current working directory with the output file name
      let finalOutputPath = path.join(process.cwd(), outputFileName);

      fs.writeFile(finalOutputPath, html, { flag: "wx" }, function(err) {
        if (err) {
          console.log("File '" + finalOutputPath + "' already existed, aborting!");
        } else {
          console.log("Done, saved as: " + finalOutputPath);
        }
      });
    });
  });
});