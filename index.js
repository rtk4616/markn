// Generated by CoffeeScript 1.9.3
(function() {
  var $, Index, M, Menu, MenuItem, Renderer, Watcher, app, dialog, md2react, remote,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  remote = require('remote');

  app = remote.require('app');

  Menu = remote.require('menu');

  MenuItem = remote.require('menu-item');

  dialog = remote.require('dialog');

  Watcher = remote.require('./watcher');

  window.React = require('react');

  md2react = require('md2react');

  $ = React.createElement;

  Index = (function() {
    function Index() {
      new M();
    }

    return Index;

  })();

  M = (function() {
    function M() {
      this.onWatcherChanged = bind(this.onWatcherChanged, this);
      this.onWatcherError = bind(this.onWatcherError, this);
      this.onFileOpenClicked = bind(this.onFileOpenClicked, this);
      this.onQuitClicked = bind(this.onQuitClicked, this);
      this.w = new Watcher();
      this.w.on('error', this.onWatcherError);
      this.w.on('change', this.onWatcherChanged);
      this.el = $(Renderer, {});
      React.render(this.el, document.body);
      Menu.setApplicationMenu(Menu.buildFromTemplate(this.template()));
    }

    M.prototype.template = function() {
      return [
        {
          submenu: [
            {
              label: 'Quit',
              accelerator: 'Command+Q',
              click: this.onQuitClicked
            }
          ]
        }, {
          label: 'File',
          submenu: [
            {
              label: 'Open',
              accelerator: 'Command+O',
              click: this.onFileOpenClicked
            }
          ]
        }, {
          label: 'Display',
          submenu: [
            {
              label: 'Open Dev Tools',
              accelerator: 'Command+Alt+I',
              click: function() {
                return remote.getCurrentWindow().openDevTools();
              }
            }
          ]
        }
      ];
    };

    M.prototype.onQuitClicked = function(e) {
      return app.quit();
    };

    M.prototype.onFileOpenClicked = function(e) {
      return dialog.showOpenDialog({
        properties: ['openFile']
      }, (function(_this) {
        return function(arg) {
          var file;
          file = arg[0];
          return _this.w.watch(file);
        };
      })(this));
    };

    M.prototype.onWatcherError = function(err) {
      console.log('onWatcherError');
      return console.error(err);
    };

    M.prototype.onWatcherChanged = function(data) {
      console.log('onWatcherChanged');
      return this.render(data);
    };

    M.prototype.render = function(md) {
      console.log('render:', md2react(md));
      return this.el.setState({
        content: md2react(md)
      });
    };

    return M;

  })();

  Renderer = React.createClass({
    getInitialState: function() {
      console.log('getInitialState');
      return {
        content: "foooo"
      };
    },
    componentDidMout: function() {
      return console.log('componentDidMount');
    },
    render: function() {
      console.log('render');
      return $('div', {}, this.state.content != null ? [this.state.content] : '');
    }
  });

  new Index();

}).call(this);
