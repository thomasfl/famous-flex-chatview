define(function(require, exports, module) {

    // Fast-click
    var FastClick = require('fastclick/lib/fastclick');
    FastClick.attach(document.body);

    // import dependencies
    // famo.us
    var Firebase = require('firebase/lib/firebase-web');
    var Engine = require('famous/core/Engine');
    var ViewSequence = require('famous/core/ViewSequence');
    var Surface = require('famous/core/Surface');
    var Modifier = require('famous/core/Modifier');
    var Transform = require('famous/core/Transform');
    var View = require('famous/core/View');
    var StockScrollView = require('famous/views/ScrollView');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Timer = require('famous/utilities/Timer');
    // infamo.us
    var moment = require('moment/moment');

    // Famous flex
    var ScrollController = require('famous-flex/ScrollController');    
    var FlexScrollView = require('famous-flex/FlexScrollView');
    // Famous components
    var AutosizeTextareaSurface = require('famous-autosizetextarea/AutosizeTextareaSurface');
    var RefreshLoader = require('famous-refresh-loader/RefreshLoader');
    // templates
    var chatBubbleTemplate = require('./chat-bubble.handlebars');
    var daySectionTemplate = require('./day-section.handlebars');


    var textareaViewMod;
    var viewSequence;
    var msgInputSurface;
    var messageInputTextArea;
    var username;

    function ChatView(options) {
        View.apply(this, arguments);
        if(options === undefined || options.username === undefined) {
            username = 'Anonymous Basterd';
        } else {
            username = options.username;
        }        

        var msgInputView = new View();
        var msgInputViewModifier = new StateModifier({
            origin: [1.0, 1.0],
            align: [1, 1]
        });
        
        var inputViewNode = msgInputView.add(msgInputViewModifier);
        this.add(msgInputView);

        msgInputSurface = new Surface({
            size: [undefined, 40],
            properties: {
                backgroundColor: 'lightgrey'
            }
        });
        inputViewNode.add(msgInputSurface);


        // Create textarea at the bottom
        var textareaView = new View();
        textareaViewMod = new StateModifier({
            size: [250, 35],
            origin: [0, 1.0],
            align: [0, 1]
        });
        var textareainputViewNode = textareaView.add(textareaViewMod);
        messageInputTextArea = _createMessageInput();
        textareainputViewNode.add(messageInputTextArea);
        inputViewNode.add(textareaView);
        _updateMessageBarHeight();

        var sendButton = _createSendButton();
        inputViewNode.add(sendButton);
        sendButton.on('click',function() {
            _sendMessage();
        });



        // Create view for scrollField
        var scrollFieldView = new View();

        var w = window,
            d = document,
            e = d.documentElement,
            g = d.getElementsByTagName('body')[0],
            windowWidth = w.innerWidth || e.clientWidth || g.clientWidth,
            windowHeight = w.innerHeight|| e.clientHeight|| g.clientHeight;
        
        var scrollFieldViewMod = new StateModifier({
            size: [undefined, (windowHeight - 35)],
            origin: [0.0, 0.0],
            align: [0.0, 0.0]
        });
        var moveToBackModifier = new StateModifier({
            transform: Transform.behind
        });
        var scrollFieldViewNode = scrollFieldView.add(moveToBackModifier).add(scrollFieldViewMod);
        this.add(scrollFieldView);
        var chatSurface = new Surface({        
            content: 'chat here',
            classes: ['message-back']
            
        });
        
        scrollFieldViewNode.add(chatSurface);
        var chatScrollView = _createScrollView();
        scrollFieldViewNode.add(chatScrollView);

        _setupFirebase();
    }


    ChatView.prototype = Object.create(View.prototype);    
    ChatView.prototype.constructor = ChatView;

    module.exports = ChatView;


    //
    // Sends a new message
    //
    function _sendMessage() {
        var value = messageInputTextArea.getValue();
        if (!value || (value === '')) {
            return;
        }
        messageInputTextArea.setValue('');
        fbMessages.push({
            author: username, // nameBar.getValue(),
            userId: _getUserId(),
            message: value,
            timeStamp: new Date().getTime()
        });
        messageInputTextArea.focus();
    }

    //
    // Adds a message to the scrollview
    //
    var afterInitialRefreshTimerId;
    var afterInitialRefresh;
    var firstKey;
    function _addMessage(data, top, key) {
        var time = moment(data.timeStamp || new Date());
        data.time = time.format('LT');
        if (!data.author || (data.author === '')) {
            data.author = 'Anonymous bastard';
        }

        // Store first key
        firstKey = firstKey || key;
        if (top && key) {
            firstKey = key;
        }

        // Insert section
        var day = time.format('LL');
        if (!top && (day !== lastSectionDay)) {
            lastSectionDay = day;
            firstSectionDay = firstSectionDay || day;
            scrollView.push(_createDaySection(day));
        } else if (top && (day !== firstSectionDay)) {
            firstSectionDay = day;
            scrollView.insert(0, _createDaySection(day));
        }

        //console.log('adding message: ' + JSON.stringify(data));
        var chatBubble = _createChatBubble(data);
        if (top) {
            scrollView.insert(1, chatBubble);
        }
        else {
            scrollView.push(chatBubble);
        }
        if (!top) {

            // Scroll the latest (newest) chat message
            if (afterInitialRefresh) {
                scrollView.goToLastPage();
                scrollView.reflowLayout();
            }
            else {

                // On startup, set datasource to the last page immediately
                // so it doesn't scroll from top to bottom all the way
                viewSequence = viewSequence.getNext() || viewSequence;
                scrollView.setDataSource(viewSequence);
                scrollView.goToLastPage();
                if (afterInitialRefreshTimerId === undefined) {
                    afterInitialRefreshTimerId = Timer.setTimeout(function() {
                        afterInitialRefresh = true;
                    }, 100);
                }
            }
        }
    }


    //
    // Create pull to refresh header
    //
    var pullToRefreshHeader;
    function _createPullToRefreshCell() {
        pullToRefreshHeader = new RefreshLoader({
            size: [undefined, 60],
            pullToRefresh: true,
            pullToRefreshBackgroundColor: 'white'
        });
    }
    //
    // Create scrollview
    //
    var scrollView;
    function _createScrollView() {
        viewSequence = new ViewSequence();
        _createPullToRefreshCell();
        scrollView = new FlexScrollView({
            layoutOptions: {
                // callback that is called by the layout-function to check
                // whether a node is a section
                isSectionCallback: function(renderNode) {
                    return renderNode.properties.isSection;
                },
                margins: [5, 0, 0, 0]
            },
            dataSource: viewSequence,
            autoPipeEvents: true,
            flow: true,
            alignment: 1,
            mouseMove: true,
            debug: false,
            pullToRefreshHeader: pullToRefreshHeader
        });
        return scrollView;
    }

    //
    // Message-input textarea
    //
    var messageInputTextArea;
    function _createMessageInput() {
        messageInputTextArea = new AutosizeTextareaSurface({
            classes: ['message-input'],
            placeholder: 'textarea here...',
            properties: {
                resize: 'none'
            }
        });
        messageInputTextArea.on('scrollHeightChanged', _updateMessageBarHeight);
        messageInputTextArea.on('keydown', function(e) {
            // if (e.keyCode === 13) {
            //     e.preventDefault();
            //     _sendMessage();
            // }
        });
        return messageInputTextArea;
    }

    //
    // Updates the message-bar height to accomate for the text that
    // was entered in the message text-area.
    //
    function _updateMessageBarHeight() {
        var newHeight = Math.max(Math.min(messageInputTextArea.getScrollHeight() + 5, 200), 35);
        var height = textareaViewMod.getSize()[1];
        var width = textareaViewMod.getSize()[0];
        if (newHeight !== height) {
            textareaViewMod.setSize([width, newHeight]);
            // Todo Modify surrounding area size too.

            // var footerHeight = msgInputSurface.getSize()[1]
            // var footerWidth = msgInputSurface.getSize()[0];
            msgInputSurface.setSize([undefined, newHeight + 4 ]);
            
            return true;
        }
        return false;
    }

    function _createSendButton() {
        var sendButton = new Surface({
            content: 'Send',
            size: [50, 35],
            origin: [0.5, 1.0],
            align: [0.5, 1],
            properties: {
                lineHeight: '35px',
                color: 'green',
                cursor: 'pointer'
            }
        });
        sendButton.on('mousedown', function() {
            sendButton.setProperties({color: 'white'});
        });
        sendButton.on('mouseleave', function() {
            sendButton.setProperties({color: 'green'});
        });
        sendButton.on('mouseup', function() {
            sendButton.setProperties({color: 'green'});
        });
        return sendButton;
    }

    //
    // setup firebase
    //
    var fbMessages;
    var firstSectionDay;
    var lastSectionDay;
    function _setupFirebase() {
        fbMessages = new Firebase('https://famous-flex-chat.firebaseio.com/messages');
        fbMessages.limitToLast(30).on('child_added', function(snapshot) {
            _addMessage(snapshot.val(), false, snapshot.key());
        });
    }


    //
    // Create a chat-bubble
    //
    function _createChatBubble(data) {
        var surface = new Surface({
            size: [undefined, true],
            classes: ['message-bubble', (data.userId === _getUserId()) ? 'send' : 'received'],
            content: chatBubbleTemplate(data),
            properties: {
                message: data.message
            }
        });
        return surface;
    }

    //
    // Create a day section
    //
    function _createDaySection(day) {
        return new Surface({
            size: [undefined, 42],
            classes: ['message-day'],
            content: daySectionTemplate({text: day}),
            properties: {
                isSection: true
            }
        });
    }

    //
    // Generates a unique id for every user so that received messages
    // can be distinguished comming from this user or another user.
    //
    var userId;
    function _getUserId() {
        if (!userId) {
            userId = localStorage.userId;
            if (!userId) {
                userId = cuid();
                localStorage.userId = userId;
            }
        }
        return userId;
    }

});
