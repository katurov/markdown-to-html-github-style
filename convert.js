var showdown  = require('showdown');
var fs = require('fs');
// --- ИЗМЕНЕНИЕ: Подключаем модуль 'path' для удобной работы с путями к файлам
const path = require('path'); 

// --- ИЗМЕНЕНИЕ: Новая логика обработки аргументов
// process.argv[2] теперь ОБЯЗАТЕЛЬНЫЙ аргумент - путь к файлу Markdown
// process.argv[3] теперь НЕОБЯЗАТЕЛЬНЫЙ аргумент - заголовок страницы
let inputFilePath = process.argv[2];
let pageTitle = process.argv[3] || ''; // Если заголовок не указан, он будет пустым
// plausibleDomain больше не используется в этой логике, но можно вернуть при необходимости
let plausibleDomain = ""; 

// --- ИЗМЕНЕНИЕ: Добавлена проверка наличия обязательного аргумента
if (!inputFilePath) {
  console.error("Ошибка: Вы должны указать путь к файлу для конвертации.");
  console.error("Пример: node convert.js ../my-docs/guide.md \"Мой Гайд\"");
  process.exit(1); // Выход из скрипта с кодом ошибки
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

// Пути к стилям остаются прежними, так как они находятся относительно самого скрипта
fs.readFile(__dirname + '/style.css', function (err, styleData) {
  fs.readFile(__dirname + '/node_modules/highlight.js/styles/atom-one-dark.css', function(err, highlightingStyles) {
    // --- ИЗМЕНЕНИЕ: Читаем файл по пути, указанному в первом аргументе
    fs.readFile(inputFilePath, function (err, data) {
      if (err) {
        // Улучшаем сообщение об ошибке
        console.error("Не удалось прочитать файл:", inputFilePath);
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

      // --- ИЗМЕНЕНИЕ: Логика формирования пути для сохранения файла
      // 1. Получаем базовое имя файла из входного пути (например, "README.md" из "../docs/README.md")
      const inputFileName = path.basename(inputFilePath, '.md'); // Второй аргумент убирает расширение
      // 2. Создаем имя HTML-файла
      const outputFileName = inputFileName + ".html";
      // 3. Формируем путь для сохранения в текущей рабочей директории (откуда запущен скрипт)
      let finalOutputPath = path.join(process.cwd(), outputFileName);

      fs.writeFile(finalOutputPath, html, { flag: "wx" }, function(err) {
        if (err) {
          console.log("Файл '" + finalOutputPath + "' уже существует. Операция отменена!");
        } else {
          console.log("Готово, сохранено в " + finalOutputPath);
        }
      });
    });
  });
});