gulp-fontello-import
====================

Import svg files to fontello icon font project, use svg filename as glyph name. Also provide task for auto download exported css and font files into desinated folder.

_This plugin currently is not utilizing streams for gulp, and used a lot of sync operation. This will be improved later with a pure gulp stream solution._

## Recommended Structure

<pre>
---project folder
   |--css (location can be specified in task options, output icon font css)
   |--fonts (location can be specified in task options, output icon fonts)
   |--svg-src (location can be specified in task options, put svg source files here, with correct naming.)
   |--gulpfile.js (write your task here, can take the example gulpfile as reference)
   |--config.json (fontello config file, this path can be specified in task options)
</pre>
