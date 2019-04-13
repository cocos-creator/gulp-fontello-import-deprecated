var gulp = require('gulp');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var needle = require('needle');
var unzip = require('unzip');
var SvgPath = require('svgpath');

var map = require('map-stream');
var utils = require('./lib/utils');
var svg_image_flatten = require('./lib/_svg_image_flatten');
var customIcons = [];
var fontelloIcons = [];

var maxCode = _.max(customIcons, function(glyph) {
  return glyph.code;
}).code;

var allocatedRefCode = (!maxCode) ? 59392 : maxCode + 1;

var HOST = 'http://fontello.com';

function apiRequest(options, successCallback, errorCallback) {
  var data;
  if (options.host == null) {
    options.host = HOST;
  }
  data = {
    config: {
      file: options.config,
      content_type: 'application/json'
    }
  };
  return needle.post(options.host, data, {
    multipart: true
  }, function(error, response, body) {
    var sessionId, sessionUrl;
    if (error) {
      throw error;
    }
    sessionId = body;
    if (response.statusCode === 200) {
      sessionUrl = "" + options.host + "/" + sessionId;
      return typeof successCallback === "function" ? successCallback(sessionUrl) : void 0;
    } else {
      return typeof errorCallback === "function" ? errorCallback(response) : void 0;
    }
  });
}

function getIconFont(options, cb) {
  return apiRequest(options, function(sessionUrl) {
    var zipFile;
    zipFile = needle.get("" + sessionUrl + "/get", function(error, response, body) {
      if (error) {
        throw error;
      }
    });
    if (options.css && options.font) {
      return zipFile.pipe(unzip.Parse()).on('entry', (function(entry) {
        var cssPath, dirName, fileName, fontPath, pathName, type, _ref;
        pathName = entry.path, type = entry.type;
        if (type === 'File') {
          dirName = (_ref = path.dirname(pathName).match(/\/([^\/]*)$/)) != null ? _ref[1] : void 0;
          fileName = path.basename(pathName);
          switch (dirName) {
            case 'css':
              if (
                  (fileName === 'animation.css' && options.animation === false) ||
                  (fileName.match(/.*-codes.*/) && options.codes === false) ||
                  (fileName.match(/.*-ie7.*/) && options.ie7 === false) ||
                  (fileName.match(/.*-embedded\.css/) && options.embedded === false)
                ) {
                return;
              } else {
                if (options.ext) {
                  fileName = fileName.replace('.css', options.ext)
                }
                cssPath = path.join(options.css, fileName);
                return entry.pipe(fs.createWriteStream(cssPath));
              }
            case 'font':
              fontPath = path.join(options.font, fileName);
              return entry.pipe(fs.createWriteStream(fontPath));
            default:
              return entry.autodrain();
          }
        }
      })).on('finish', (function() {
        console.log('Install complete.\n');
        cb();
        return;
      }));
    } else {
      return zipFile.pipe(unzip.Extract({
        path: 'icon-example'
      })).on('finish', (function() {
        console.log('Install complete.\n');
        cb();
        return;
      }));
    }
  });
}

function getSvgSrcFiles(opts, cb) {
  var config = JSON.parse(fs.readFileSync(opts.config || 'config.json'));
  getCustomIcons(config);
  var svgList = [];
  var stream = gulp.src(path.join(opts.svgsrc, '*.svg')).pipe(map(function(data, callback) {
    var name = path.basename(data.path, '.svg');
    var content = data._contents.toString('utf8');
    var obj = {
      content: content,
      name: name
    };
    svgList.push(obj);
    // console.log(data._contents.toString('utf8'));
    // console.log(path.basename(data.path, '.svg'));
    callback(null, obj);
    }));
  stream.on('end', function() {
    // console.log("stream finished");
    // console.log(svgList);
    _.each(svgList, function(data) {
      var entry = processSvg(data);
      //console.log(JSON.stringify(entry));
      updateCustomIcons(entry);
    });
    config.glyphs = _.union(customIcons, fontelloIcons);
    fs.writeFileSync(opts.config, JSON.stringify(config));
    cb();
  });
}

function updateCustomIcons(newGlyph) {
  var found = false;
  var entry = _.find(customIcons, function(glyph) {
    return glyph.css === newGlyph.css;
  });
  if (entry) {
    entry.svg = newGlyph.svg;
  } else {
    customIcons.push(newGlyph);
  }
}

function processSvg(data) {
  var result = svg_image_flatten(data.content);
  if (result.error) {
    throw result.error;
  }
  // var skipped = _.union(result.ignoredTags, result.ignoredAttrs);
  // if (skipped.length > 0) {
  //     console.log('skipped' + skipped.toString());
  // } else if (!result.guaranteed) {
  //     console.log('err_merge_path');
  // }

  // Scale to standard grid
  var scale = 1000 / result.height;
  var d = new SvgPath(result.d)
    .translate(-result.x, -result.y)
    .scale(scale)
    .abs()
    .round(1)
    .toString();
  var width = Math.round(result.width * scale); // new width

  var glyphName = data.name.replace(/\s/g, '-');

  var newGlyph = {
    uid: uid(),
    css: glyphName,
    code: allocatedRefCode++,
    src: 'custom_icons',
    // charRef:  allocatedRefCode++,
    search: [glyphName],
    selected: true,
    svg: {
      path: d,
      width: width
    }
  };

  return newGlyph;
}


function getCustomIcons(config) {
  var allGlyphsArray = config.glyphs;
  customIcons = [];
  fontelloIcons = [];
  for (var i = 0; i < allGlyphsArray.length; ++i) {
    if (allGlyphsArray[i].src === "custom_icons") {
      customIcons.push(allGlyphsArray[i]);
    } else {
      fontelloIcons.push(allGlyphsArray[i]);
    }
  }
}

function uid() {
  /*jshint bitwise: false*/
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[x]/g, function() {
    return ((Math.random() * 16) | 0).toString(16);
  });
}

module.exports = {
    importSvg: function (options, cb) {
        getSvgSrcFiles(options, cb);
    },
    getFont: function (options, cb) {
        getIconFont(options, cb);
    }
};
