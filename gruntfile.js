module.exports = function(grunt) {

  // replace these with your own paths
  var stemappDir = '../../custombuilders/devsummitbuilder13/client/stemapp';
  var themeconfigsDir = 'themeconfigs';

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  grunt.registerTask('generateThemeConfig', 'update widget positions', function() {
    // these are the properties transferred from the original theme config.json to
    // the generated test config. Supports chained properties with dots up to four deep.
    var overwriteProperties = ['widgetOnScreen', 'map.2D', 'map.3D', 'map.position', 'widgetPool'];
    var processedConfigs = [];
    var processedThemes = {};

    /* ---------- function definitions ---------- */

    function getExistingConfig(options) {
      var existingConfig;
      // find the base config file to use
      if (grunt.file.exists(options.dest)) {
        // the config file exists already
        existingConfig = grunt.file.readJSON(options.dest);
        grunt.log.writeln('Updating config file ' + options.dest['cyan']);
      } else {
        // if one hasn't yet been written, use the stemapp's default config as a starting point
        existingConfig = grunt.file.readJSON(stemappDir + '/config.json');
        // but replace some of the app properties so it's clearer it's not the default config
        existingConfig.theme.name = options.theme;
        existingConfig.title = 'Using config generated by Grunt';
        existingConfig.subtitle = 'edit config in ' + themeconfigsDir + '/ folder';
        existingConfig.logo = 'themes/' + options.theme + '/images/icon.png';
        grunt.log.writeln('Generating config file ' + options.dest['green']);
      }
      processedThemes[options.theme].layouts.push(options.layout);
      processedConfigs.push(options.dest);
      return existingConfig;
    }

    function overwrite(outputConfig, themeConfig, prop) {
      var fieldSplit = prop.split('.');
      if (fieldSplit.length === 1) {
        outputConfig[fieldSplit[0]] = themeConfig[fieldSplit[0]];
      } else if (fieldSplit.length === 2) {
        outputConfig[fieldSplit[0]][fieldSplit[1]] = themeConfig[fieldSplit[0]][fieldSplit[1]];
      } else if (fieldSplit.length === 3) {
        outputConfig[fieldSplit[0]][fieldSplit[1]][fieldSplit[2]] = themeConfig[fieldSplit[0]][fieldSplit[1]][fieldSplit[2]];
      } else if (fieldSplit.length === 3) {
        outputConfig[fieldSplit[0]][fieldSplit[1]][fieldSplit[2]][fieldSplit[3]] = themeConfig[fieldSplit[0]][fieldSplit[1]][fieldSplit[2]][fieldSplit[3]];
      } else {
        grunt.log.writeln('Depth of overwrite field too large: ', prop);
        return;
      }
    }

    function getAdjacent(split, term) {
      return split[split.indexOf(term) + 1];
    }

    function processThemeConfig(options) {
      var themeConfig = grunt.file.readJSON(options.file);
      var outputConfig = getExistingConfig(options);

      // overwrite the properties in the app config from this layout's config
      overwriteProperties.forEach(function(prop) {
        overwrite(outputConfig, themeConfig, prop);
      });
      return outputConfig;
    }

    function processColors(outputConfig, themeName) {

      // list available styles in config
      var themeColorFiles = grunt.file.expand('themes/' + themeName + '/styles/*/style.css');
      outputConfig.theme.styles = outputConfig.theme.styles || [];
      // copy existing styles to compare later
      var processedStyles = [];
      themeColorFiles.forEach(function(colorFile) {
        var colorSplit = colorFile.split('/');
        var colorName = getAdjacent(colorSplit, 'styles');
        if (outputConfig.theme.styles.indexOf(colorName) < 0) {
          outputConfig.theme.styles.push(colorName);
        }
        processedStyles.push(colorName);
        if (processedThemes[themeName].colors.indexOf(colorName) < 0) {
          processedThemes[themeName].colors.push(colorName);
        }
      });
      // get rid of output styles that don't exist anymore
      outputConfig.theme.styles = outputConfig.theme.styles.filter(function(style) {
        return processedStyles.indexOf(style) >= 0;
      });
    }

    function getLayoutDest(themeName, layoutName) {
      return themeconfigsDir +  '/config-' + themeName + '-' + layoutName + '.json';
    }

    function processManifestColors(theme, manifest) {
      processedThemes[theme].colors.forEach(function(colorName) {
        var exists = manifest.styles.some(function(colorObj) {
          return colorObj.name === colorName;
        });
        if (!exists) {
          manifest.styles.push({
            name: colorName,
            description: 'TODO: Change this description and styleColor for ' + colorName,
            styleColor: '#00ff00'
          });
        }
      });
      console.log('manifest.styles', JSON.stringify(manifest.styles));
      manifest.styles = manifest.styles.filter(function(colorObj) {
        return processedThemes[theme].colors.indexOf(colorObj.name) >= 0;
      });
    }

    function processManifestLayouts(theme, manifest) {
      processedThemes[theme].layouts.forEach(function(layoutName) {
        var exists = manifest.layouts.some(function(layoutObj) {
          return layoutObj.name === layoutName;
        });
        if (!exists) {
          manifest.layouts.push({
            name: layoutName,
            description: 'TODO: Change this description for ' + layoutName
          });
        }
      });
      manifest.layouts = manifest.layouts.filter(function(layoutObj) {
        return processedThemes[theme].layouts.indexOf(layoutObj.name) >= 0;
      });
    }

    function updateManifests() {
      console.log('processedThemes keys', Object.keys(processedThemes));
      Object.keys(processedThemes).forEach(function(theme) {
        var fileName = 'themes/' + theme + '/manifest.json';
        var manifest = grunt.file.readJSON(fileName);
        processManifestColors(theme, manifest);
        processManifestLayouts(theme, manifest);
        grunt.file.write(fileName, JSON.stringify(manifest, null, '  '));
      });
    }

    function cleanupThemeConfigs() {
      var generatedConfigs = grunt.file.expand(themeconfigsDir +  '/config-*.json');
      generatedConfigs.forEach(function(genConfig) {
        if (processedConfigs.indexOf(genConfig) < 0) {
          grunt.log.writeln('Should delete old generated config here'['red']);
        }
      });
    }

    function writeClosingInstructions() {
      grunt.log.writeln('\nReminder: these properties come from the original theme layout config files: ');
      grunt.log.writeln(overwriteProperties.join(', '));
      grunt.log.writeln('All other properties should be edited in the generated files in ' + themeconfigsDir + '/ and are used for testing only. They will not persist in a new app in builder mode.'['yellow']);
      grunt.log.writeln('\nTo test, open ' + 'webappbuilder/stemapp?config=' + themeconfigsDir + '/config-[theme]-[layout].json');
      grunt.log.writeln('\nTo change the color, edit the order of the \'styles\' array in the config.');
    }

    /* ---------- code ---------- */

    // get all theme config.jsons
    var layoutConfigs = grunt.file.expand('themes/*/layouts/*/config.json');

    layoutConfigs.forEach(function(fileName) {
      var nameSplit = fileName.split('/');
      var themeName = getAdjacent(nameSplit, 'themes');
      var layoutName = getAdjacent(nameSplit, 'layouts');
      var configDest = getLayoutDest(themeName, layoutName);
      processedThemes[themeName] = processedThemes[themeName] || {
        layouts: [],
        colors: []
      };
      grunt.log.writeln('processedThemes', JSON.stringify(processedThemes));

      var outputConfig = processThemeConfig({
        file: fileName,
        theme: themeName,
        layout: layoutName,
        dest: configDest
      });

      processColors(outputConfig, themeName);

      grunt.file.write(configDest, JSON.stringify(outputConfig, null, '  '));

    });

    updateManifests();

    cleanupThemeConfigs();

    writeClosingInstructions();

});

  grunt.initConfig({
    watch: {
      main: {
        files: ['themes/**', '!themes/*/styles/preprocessing/**'],
        tasks: ['sync:main'],
        options: {
          spawn: false
        }
      },
      themeconfigs: {
        // need to include styles here in case the style config isn't already written
        files: ['themes/*/layouts/*/config.json', 'themes/*/styles/*/style.css'],
        tasks: ['generateThemeConfig'],
        options: {
          spawn: false
        }
      },
      css: {
        files: ['themes/*/styles/preprocessing/*.scss'],
        tasks: ['sass:dev']
      }

    },

    sass: {
      dev: {
        options: {
          lineNumbers: true,
          outputStyle: 'expanded'
        },
        files: [{
          cwd: 'themes/',
          src: ['*/styles/preprocessing/*.scss', '!*/styles/preprocessing/_*.scss'],
          dest: 'themes/',
          rename: function(dest, src) {
            var srcSplit = src.split('/');
            var themeName = srcSplit[0];
            var styleName = srcSplit[3].slice(0, srcSplit[3].lastIndexOf('.'));
            var actualDest;
            if (styleName === 'common') {
              // common.css lives in the theme's root
              actualDest = dest + themeName + '/common.css';
            } else {
              // style-specific css lives in the theme's styles/styleName folder as style.css
              actualDest = dest + themeName + '/styles/' + styleName + '/style.css';
            }
            grunt.log.writeln('writing css file ' + actualDest['cyan']);
            return actualDest;
          },
          expand: true
        }]
      }
    },

    clean: {
      // styles: ['themes/*/styles/**', 'themes/*/common.css', '!themes/*/styles/preprocessing/**']
    },

    sync: {
      main: {
        files: [{
          src: ['themes/**', themeconfigsDir + '/**', '!themes/*/styles/preprocessing/**'],
          dest: stemappDir
        }],
        verbose: true // Display log messages when syncing files
      }
    }

  });

  grunt.registerTask('default', ['sass', 'generateThemeConfig', 'sync', 'watch']);
};
