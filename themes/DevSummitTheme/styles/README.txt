You are in the "styles" folder of a WebAppBuilder theme, which defines the different "styles" (mostly colors) available for the theme. Each folder in "styles" represents a different color choice for your WebAppBuilder theme.

Within a theme, WebAppBuilder expects the following structure:

V styles
  V default
    style.css
  V color1
    style.css
  V color2
    style.css
  ...

To allow for css preprocessing, this starter repo adds a "preprocessing" folder -- a place to put all your sass files -- in the styles/ folder. Grunt then watches this folder for changes, runs sass on any top-level non-partial sass files within the folder, and outputs the results to a style.css file within a folder named for the source sass file.

The preprocessing folder will NOT be copied out to the stemapp, and will NOT be included in the `grunt dist` output.

WebAppBuilder also expects a common.css file in the theme's root. Grunt will look for the file named 'common.scss' within the preprocessing folder, and output it to 'common.css' within the theme's root.

Example:

V preprocessing
  _overrides.scss  // because this is a partial (starts with an underscore), it won't be processed
  _panels.scss     // not processed (partial)
  common.scss      // this file will be processed and output to [themeroot]/common.css
  default.scss     // to [themeroot]/styles/default/style.css
  fuchsia.scss     // to [themeroot]/styles/fuchsia/style.css
  > jimu-overrides // nothing in this folder will be processed
  lime.scss        // to [themeroot]/styles/lime/style.css
  > variables      // not processed


Please name your main style 'default'.

NOTE: While you are developing, you should make all your changes in the preprocessing folder, as any changes in the styles/*/style.css or common.css files will be overwritten when any sass file is changed.
