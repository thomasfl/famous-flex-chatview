/**
 * This Source Code is licensed under the MIT license. If a copy of the
 * MIT-license was not distributed with this file, You can obtain one at:
 * http://opensource.org/licenses/mit-license.html.
 *
 * @author: Hein Rutjes (IjzerenHein)
 * @license MIT
 * @copyright Gloey Apps, 2014
 */

/*global define, Please, console*/
/*eslint no-console:0 no-use-before-define:0*/

define(function(require) {

    //<webpack>
    require('famous-polyfills');
    require('famous/core/famous.css');
    require('./styles.css');
    require('./index.html');
    //</webpack>

    // Fast-click
    var FastClick = require('fastclick/lib/fastclick');
    FastClick.attach(document.body);

    // import dependencies
    var Firebase = require('firebase/lib/firebase-web');
    // famous
    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ViewSequence = require('famous/core/ViewSequence');
    var Surface = require('famous/core/Surface');
    var Modifier = require('famous/core/Modifier');
    var Transform = require('famous/core/Transform');
    var StateModifier = require('famous/modifiers/StateModifier');
    // famous-flex
    var FlexScrollView = require('famous-flex/FlexScrollView');
    var HeaderFooterLayout = require('famous-flex/layouts/HeaderFooterLayout');
    var LayoutController = require('famous-flex/LayoutController');
    var Lagometer = require('famous-lagometer/Lagometer');
    var AutosizeTextareaSurface = require('famous-autosizetextarea/AutosizeTextareaSurface');
    var Timer = require('famous/utilities/Timer');
    var InputSurface = require('famous/surfaces/InputSurface');
    var RefreshLoader = require('famous-refresh-loader/RefreshLoader');
    var moment = require('moment/moment');
    var cuid = require('cuid');
    // templates
    var chatBubbleTemplate = require('./chat-bubble.handlebars');
    var daySectionTemplate = require('./day-section.handlebars');

    // Components
    var ChatView = require('./ChatView');

    var mainContext = Engine.createContext();

    var pageBackground = new Surface({
        content: 'page background',
        properties: {
            backgroundColor: 'yellow'
        }
    });
    var backModifier = new StateModifier({
        // positions the background behind the tab surface
        transform: Transform.behind
    });
    mainContext.add(backModifier).add(pageBackground);

    var pageView = new View();
    var pageViewModifier = new StateModifier({
        size: [400,400],
        origin: [0.5, 0.8],
        align: [0.5, 0.5]
    });
    var pageViewNode = pageView.add(pageViewModifier);

    mainContext.add(pageView);

    var backgroundSurface = new Surface({    
        content: 'Main view',
        properties: {
            backgroundColor: '#fa5c4f',
            color: 'white'
        }
    });

    var backModifier = new StateModifier({
        // positions the background behind the tab surface
        transform: Transform.behind
    });

    pageViewNode.add(backModifier).add(backgroundSurface);

    var chatView = new ChatView({'username':'Ponny Jonny'});
    pageViewNode.add(chatView);

});
