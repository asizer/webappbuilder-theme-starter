module.exports = function(grunt) {

  // replace these with your own paths
  var stemappDir = '../../custombuilders/devsummitbuilder13/client/stemapp';
  var themeconfigsDir = 'themeconfigs';
  var themesDir = 'themes';
  var distDir = 'built';

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    watch: {
      themes: {
        files: [
          themesDir + '/**',
          '!' + themesDir + '/*/styles/preprocessing/**',
          '!' + themesDir + '/*/layouts/*/config.json',
          themeconfigsDir + '/**'],
        tasks: ['sync'],
        options: {
        }
      },
      layoutsAndColors: {
        files: [themesDir + '/*/layouts/*/config.json', themesDir + '/*/styles/*/style.css'],
        tasks: ['generateThemeConfig', 'updateThemeManifests', 'suggestConfigCleanups', 'sync'],
        options: {
          event: ['added', 'deleted']
        }
      },
      themeConfigs: {
        // need to include styles here in case the style config isn't already written
        files: [themesDir + '/*/layouts/*/config.json'],
        tasks: ['generateThemeConfig', 'sync'],
        options: {
        }
      },
      css: {
        files: [themesDir + '/*/styles/preprocessing/**'],
        tasks: ['sass:dev', 'sync'],
        options: {
        }
      }
    },

    sass: {
      dev: {
        options: {
          lineNumbers: true,
          outputStyle: 'expanded',
          banner: '/* hello world */'
        },
        files: [{
          cwd: themesDir,
          src: ['*/styles/preprocessing/*.scss', '!*/styles/preprocessing/_*.scss'],
          dest: themesDir,
          rename: function(dest, src) {
            var srcSplit = src.split('/');
            var themeName = srcSplit[0];
            var styleName = srcSplit[3].slice(0, srcSplit[3].lastIndexOf('.'));
            var actualDest;
            if (styleName === 'common') {
              // common.css lives in the theme's root
              actualDest = dest + '/' + themeName + '/common.css';
            } else {
              // style-specific css lives in the theme's styles/styleName folder as style.css
              actualDest = dest + '/' + themeName + '/styles/' + styleName + '/style.css';
            }
            grunt.log.writeln('writing css file ' + actualDest['cyan']);
            return actualDest;
          },
          expand: true
        }]
      }
    },

    sync: {
      main: {
        files: [{
          src: [themesDir + '/**', themeconfigsDir + '/**', '!' + themesDir + '/*/styles/preprocessing/**'],
          dest: stemappDir
        }],
        verbose: true // Display log messages when syncing files
      }
    },

    clean: {
      dist: [distDir]
    },

    copy: {
      dist: {
        src: [themesDir, '!' + themesDir + '/*/styles/preprocessing/**'],
        dest: distDir
      }
    }

  });

  grunt.registerTask('default', ['sass', 'generateThemeConfig', 'updateThemeManifests', 'suggestConfigCleanups', 'sync', 'watch']);
  grunt.registerTask('dist', ['clean:dist', 'copy:dist']);







  /* ---------- CODE THAT MIGHT EVENTUALLY END UP AS ITS OWN PLUGIN(S) SOMEDAY ---------- */
  /* -------- but for now will just live here as registeredTasks in this project -------- */


  /* ---------- some utility functions used by multiple custom tasks below ---------- */
  function getAdjacent(split, term) {
    return split[split.indexOf(term) + 1];
  }

  function getLayoutDest(themeName, layoutName) {
    return themeconfigsDir +  '/config-' + themeName + '-' + layoutName + '.json';
  }

  /* ---------- tasks to process and copy theme configs and manifests ---------- */

  grunt.registerTask('suggestConfigCleanups', 'report unused theme configs', function() {

    /* ---------- functions ---------- */

    function findThemeLayouts(theme) {
      var themeLayoutNames = grunt.file.expand(themesDir + '/' + theme + '/layouts/*')
        .filter(function(fileName) {
          return grunt.file.isDir(fileName);
        }).map(function(fileName) {
          return getAdjacent(fileName.split('/'), 'layouts');
        });
      return themeLayoutNames;
    }

    /* ---------- code ---------- */

    var themeNames = grunt.file.expand(themesDir + '/*').filter(function(fileName) {
      return grunt.file.isDir(fileName);
    }).map(function(fileName) {
      return getAdjacent(fileName.split('/'), themesDir);
    });

    var processedConfigs = [];

    themeNames.forEach(function(themeName) {
      var layouts = findThemeLayouts(themeName);
      layouts.forEach(function(layoutName) {
        processedConfigs.push(getLayoutDest(themeName, layoutName));
      });
    });

    var generatedConfigs = grunt.file.expand(themeconfigsDir +  '/config-*.json');
    generatedConfigs.forEach(function(genConfig) {
      if (processedConfigs.indexOf(genConfig) < 0) {
        grunt.log.writeln('Outdated config should be removed, here and in stemapp: ' + genConfig['red']);
      }
    });

  });

  grunt.registerTask('updateThemeManifests', 'update manifest.json files to reflect current state of theme layouts and colors', function() {

    function processManifestColors(theme, manifest) {
      var colorLayoutDirs = grunt.file.expand(themesDir + '/' + theme + '/styles/*/style.css')
        .filter(function(fileName) {
          return fileName.indexOf('preprocessing') < 0;
        }).map(function(fileName) {
          return getAdjacent(fileName.split('/'), 'styles');
        });

      colorLayoutDirs.forEach(function(colorName) {
        var exists = manifest.styles.some(function(colorObj) {
          return colorObj.name === colorName;
        });
        if (!exists) {
          manifest.styles.push({
            name: colorName,
            description: 'TODO: Change this description and styleColor for ' + colorName,
            styleColor: '#00FF00'
          });
        }
      });
      manifest.styles = manifest.styles.filter(function(colorObj) {
        return colorLayoutDirs.indexOf(colorObj.name) >= 0;
      });
    }

    function processManifestLayouts(theme, manifest) {
      var themeLayoutDirs = grunt.file.expand(themesDir + '/' + theme + '/layouts/*/config.json')
        .map(function(fileName) {
          return getAdjacent(fileName.split('/'), 'layouts');
        });

      themeLayoutDirs.forEach(function(layoutName) {
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
        return themeLayoutDirs.indexOf(layoutObj.name) >= 0;
      });
    }

    function updateManifest(theme) {
      var fileName = themesDir + '/' + theme + '/manifest.json';
      var manifest = grunt.file.readJSON(fileName);
      processManifestColors(theme, manifest);
      processManifestLayouts(theme, manifest);
      grunt.log.writeln('updating ', fileName['cyan']);
      grunt.file.write(fileName, JSON.stringify(manifest, null, '  '));
    }

    /* ---------- code --------- */

    var themeConfigDirs = grunt.file.expand(themesDir + '/*/manifest.json')
      .map(function(fileName) {
        return getAdjacent(fileName.split('/'), themesDir);
      });

    themeConfigDirs.forEach(function(themeName) {
      updateManifest(themeName);
    });

  });

  grunt.registerTask('generateThemeConfig', 'update widget positions', function() {
    // these are the properties transferred from the original theme config.json to
    // the generated test config. Supports chained properties with dots up to four deep.
    var overwriteProperties = ['widgetOnScreen', 'map.2D', 'map.3D', 'map.position', 'widgetPool'];

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
        existingConfig.logo = themesDir + '/' + options.theme + '/images/icon.png';
        grunt.log.writeln('Generating config file ' + options.dest['green']);
      }
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
      var themeColorFiles = grunt.file.expand(themesDir + '/' + themeName + '/styles/*/style.css');
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
      });
      // get rid of output styles that don't exist anymore
      outputConfig.theme.styles = outputConfig.theme.styles.filter(function(style) {
        return processedStyles.indexOf(style) >= 0;
      });
    }

    /* ---------- code ---------- */

    // get all theme config.jsons
    var layoutConfigs = grunt.file.expand(themesDir + '/*/layouts/*/config.json');

    layoutConfigs.forEach(function(fileName) {
      var nameSplit = fileName.split('/');
      var themeName = getAdjacent(nameSplit, themesDir);
      var layoutName = getAdjacent(nameSplit, 'layouts');
      var configDest = getLayoutDest(themeName, layoutName);

      var outputConfig = processThemeConfig({
        file: fileName,
        theme: themeName,
        layout: layoutName,
        dest: configDest
      });

      processColors(outputConfig, themeName);

      grunt.file.write(configDest, JSON.stringify(outputConfig, null, '  '));

    });

  });

};
