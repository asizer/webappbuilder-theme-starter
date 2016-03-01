define([
  'dojo/query',
  'dojo/topic'
], function(dojoQuery, topic){
  console.debug('Created to DevSummitTheme. Add and remove body classes here');
  // dojoQuery('body').removeClass('claro').addClass('flat');

  // this main.js only runs the first time a user switches to this theme,
  // so unfortunately there's no way to just attach and remove a topic.subscribe
  // listener every time the theme is chosen or unchosen. So we keep the listener
  // around and set a flag when this theme is switched to so that we're not
  // putting claro back every time two other themes are switched between.
  var isThisTheme = true;
  topic.subscribe('appConfigChanged', function(appConfig, changeType, newThemeName) {
    if (changeType !== 'themeChange') {
      return;
    }
    if (newThemeName === 'DevSummitTheme') {
      console.debug('Changed to DevSummitTheme. Add and remove body classes here');
      // dojoQuery('body').removeClass('claro').addClass('flat');
      isThisTheme = true;
    } else if (isThisTheme) {
      console.debug('Switched away from DevSummitTheme. Add and remove body classes here');
      // dojoQuery('body').addClass('claro').removeClass('flat');
      isThisTheme = false;
    } else {
      // DevSummitTheme is not being switched to or away from, so do nothing.
      // (I know the return doesn't do anything below, but jshint was complaining
      // about an empty code block)
      return;
    }
  });
});
