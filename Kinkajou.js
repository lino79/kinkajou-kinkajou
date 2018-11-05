define(["exports", "@kinkajou/tools/Tools"], function (_exports, _Tools) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.Kinkajou = void 0;

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  var UUID = '' + new Date().getTime();
  var COMPONENT_ATTR = '_c' + UUID;
  var ATTR_OBSERVER_ATTR = '_attrObs' + UUID;
  var EVENT_ATTR_PREFIX = 'on';

  function ClassInstance_hasMethod(instance, methodName) {
    return _Tools.Tools.isString(methodName) && !!_Tools.Tools.getAsFunction('constructor.prototype.hasOwnProperty', instance) && instance.constructor.prototype.hasOwnProperty(methodName);
  }

  function _dedupArray(array) {
    var result = [];

    if (_Tools.Tools.isArray(array)) {
      for (var i = 0; i < array.length; i++) {
        var item = array[i];

        if (item == null) {
          continue;
        } else if (_Tools.Tools.isArray(item)) {
          for (var x = 0; x < item.length; x++) {
            var subItem = item[x];
            result.push(subItem);
          }
        } else {
          result.push(item);
        }
      }
    }

    return result;
  }

  function _createHTMLElement(ns, tag, attrs) {
    var element;

    if (_Tools.Tools.isString(ns)) {
      element = document.createElementNS(ns, tag);
    } else {
      element = document.createElement(tag);
    }

    if (attrs) {
      for (var name in attrs) {
        if (attrs.hasOwnProperty(name)) {
          var value = attrs[name];

          if (value == null) {
            continue;
          }

          var handled = false;

          if (_Tools.Tools.isPrimitive(value)) {
            if (!value && (name == 'id' || name == 'style' || name == 'class')) {
              continue;
            }

            if (_Tools.Tools.isString(ns)) {
              element.setAttributeNS(null, name, '' + value);
            } else {
              element.setAttribute(name, '' + value);
            }

            handled = true;
          } else if (name.indexOf(EVENT_ATTR_PREFIX) == 0 && name.length > EVENT_ATTR_PREFIX.length && _Tools.Tools.isFunction(value)) {
            var eventType = name.substr(EVENT_ATTR_PREFIX.length);
            element.addEventListener(eventType, value, false);
            handled = true;
          } else if (name == 'ref' && _Tools.Tools.isFunction(value)) {
            value(element);
            handled = true;
          }

          if (!handled) {
            throw new Error('illegal attribute: ' + name + '. Element: ' + tag + '.');
          }
        }
      }
    }

    return element;
  }

  var VirtualNode =
  /*#__PURE__*/
  function () {
    function VirtualNode(type, attrs, children) {
      _classCallCheck(this, VirtualNode);

      Object.defineProperty(this, 'type', {
        value: type,
        enumerable: true
      });
      this.attrs = _Tools.Tools.toObject(attrs, {});
      this.children = _dedupArray(children);
    }

    _createClass(VirtualNode, [{
      key: "render",
      value: function render(
      /** @type {String} */
      ns) {
        if (ns != null) _Tools.Tools.assertIsString(ns, 'ns');
        var type = this.type;
        var attrs = this.attrs;
        var children = this.children;
        /** @type {Element} */

        var element;

        if (_Tools.Tools.isFunction(type)) {
          var component = Component.create(type, attrs, children);
          var ref = component.getAsFunction('ref');

          if (ref) {
            ref(component);
          }

          element = component.refresh();
          return element;
        }

        if (_Tools.Tools.isString(type)) {
          element = _createHTMLElement(ns, type, attrs);
        } else {
          throw new Error('Illegal VirtualNode type');
        }

        for (var i = 0; i < children.length; i++) {
          var vchild = children[i];
          /** @type {Node} */

          var node = void 0;

          if (_Tools.Tools.isPrimitive(vchild)) {
            node = document.createTextNode('' + vchild);
          } else if (vchild instanceof VirtualNode) {
            node = vchild.render(ns);
          }

          if (!_Tools.Tools.isInstanceOf(node, Node)) {
            throw new Error('illegal child');
          }

          element.appendChild(node);
          Component_handleAttachment(node);
        }

        return element;
      }
    }], [{
      key: "render",
      value: function render(vnode, ns) {
        _Tools.Tools.assertIsInstanceOf(vnode, VirtualNode, 'vnode', 'VirtualNode');

        return vnode.render(ns);
      }
    }]);

    return VirtualNode;
  }();

  function Component_createProperties(component, attrs) {
    var props = {};

    if (attrs) {
      for (var name in attrs) {
        if (attrs.hasOwnProperty(name)) {
          Component_createProperty(component, props, attrs, name);
        }
      }
    }

    return props;
  }

  function Component_createProperty(component, props, attrs, name) {
    Object.defineProperty(props, name, {
      enumerable: true,
      get: function get() {
        return attrs[name];
      },
      set: function set(value) {
        var oldValue = attrs[name];

        if (component.beforePropChange(name, oldValue, value) !== false) {
          attrs[name] = value;
          component.onPropChange(name, value, oldValue);
        }
      }
    });
  }

  function Component_observeDetach(callback, node) {
    var observer = new MutationObserver(function (mutations, observer) {
      mutations.forEach(function (m) {
        if (m.type === 'childList') {
          for (var i = 0; i < m.removedNodes.length; i++) {
            var removedNode = m.removedNodes[i];

            if (removedNode === node) {
              try {
                callback();
              } finally {
                try {
                  var attrObserver = removedNode[ATTR_OBSERVER_ATTR];

                  if (attrObserver) {
                    attrObserver.disconnect();
                  }
                } finally {
                  observer.disconnect();
                }
              }
            }
          }
        }
      });
    });
    observer.observe(node.parentNode, {
      childList: true
    });
  }

  function Component_observeAttrChange(callback, node) {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type === 'attributes') {
          var name = m.attributeName;
          var value = node.getAttribute(name);
          var oldValue = m.oldValue;
          callback(name, value, oldValue);
        }
      });
    });
    observer.observe(node, {
      attributes: true,
      attributeOldValue: true
    });
    node[ATTR_OBSERVER_ATTR] = observer;
  }

  function Component_handleAttachment(node) {
    _Tools.Tools.assertIsInstanceOf(node, Node, 'node', 'Node');

    var component = Component.from(node);

    if (component) {
      var onAttach = component.onAttach.bind(component);
      onAttach();

      if (node.parentNode && ClassInstance_hasMethod(component, 'onDomDetach')) {
        var callback = component.onDomDetach.bind(component);
        Component_observeDetach(callback, node);
      }

      if (ClassInstance_hasMethod(component, 'onDomAttrChange')) {
        var _callback = component.onDomAttrChange.bind(component);

        Component_observeAttrChange(_callback, node);
      }
    }
  }

  var Component =
  /*#__PURE__*/
  function () {
    _createClass(Component, [{
      key: "is",
      get: function get() {
        return _Tools.Tools.getAsString('constructor.is', this);
      }
    }, {
      key: "className",
      get: function get() {
        return Component.getClassName(this.constructor);
      }
    }, {
      key: "id",
      get: function get() {
        return _Tools.Tools.getAsString('props.id', this);
      }
    }, {
      key: "styleClass",
      get: function get() {
        return _Tools.Tools.getAsString('props.styleClass', this) || _Tools.Tools.getAsArray('styleRoot', this).concat(_Tools.Tools.getAsArray('styleProps', this)).concat(_Tools.Tools.getAsString('props.class', this).split(' ')).filter(function (c) {
          return Boolean(c);
        }).join(' ');
      }
    }, {
      key: "styleRoot",
      get: function get() {
        return this.is.split('.');
      }
    }, {
      key: "styleProps",
      get: function get() {
        return [];
      }
    }, {
      key: "style",
      get: function get() {
        return _Tools.Tools.getAsString('props.style', this);
      }
    }, {
      key: "rendered",
      get: function get() {
        return _Tools.Tools.isInstanceOf(this.element, Element);
      }
    }, {
      key: "attached",
      get: function get() {
        return this.rendered && this.element.parentNode != null;
      }
    }]);

    function Component(attrs) {
      _classCallCheck(this, Component);

      this.initProps(attrs = attrs || {}, function (attrs) {
        for (var _len = arguments.length, props = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          props[_key - 1] = arguments[_key];
        }

        _Tools.Tools.toArray(props).forEach(function (p) {
          return attrs['' + p] = attrs['' + p];
        });
      });
      var status = {};
      Object.defineProperty(this, 'props', {
        value: Component_createProperties(this, attrs),
        enumerable: true
      });
      Object.defineProperty(this, 'children', {
        get: function get() {
          return _Tools.Tools.getAsArray('children', status);
        },
        set: function set(value) {
          _Tools.Tools.set('children', value, status);
        },
        enumerable: true
      });
      Object.defineProperty(this, 'element', {
        get: function get() {
          return _Tools.Tools.get('element', status);
        },
        set: function set(value) {
          _Tools.Tools.assertIsInstanceOf(value, Element, 'element', 'Element');

          _Tools.Tools.set('element', value, status);
        },
        enumerable: true
      });
      Object.defineProperty(this, '$', {
        value: _Tools.Tools,
        enumerable: true
      });
    }

    _createClass(Component, [{
      key: "get",
      value: function get(path) {
        return _Tools.Tools.get(path, this.props);
      }
    }, {
      key: "set",
      value: function set(path, value) {
        _Tools.Tools.set(path, value, this.props);
      }
    }, {
      key: "getAsObject",
      value: function getAsObject(path, def) {
        return _Tools.Tools.getAsObject(path, this.props, def);
      }
    }, {
      key: "getAsArray",
      value: function getAsArray(path, def) {
        return _Tools.Tools.getAsArray(path, this.props, def);
      }
    }, {
      key: "getAsFunction",
      value: function getAsFunction(path, def) {
        return _Tools.Tools.getAsFunction(path, this.props, def);
      }
    }, {
      key: "getAsBoolean",
      value: function getAsBoolean(path, def) {
        return _Tools.Tools.getAsBoolean(path, this.props, def);
      }
    }, {
      key: "getAsString",
      value: function getAsString(path, def) {
        return _Tools.Tools.getAsString(path, this.props, def);
      }
    }, {
      key: "getAsFloat",
      value: function getAsFloat(path, def, min, max) {
        return _Tools.Tools.getAsFloat(path, this.props, def, min, max);
      }
    }, {
      key: "getAsInteger",
      value: function getAsInteger(path, def, min, max) {
        return _Tools.Tools.getAsInteger(path, this.props, def, min, max);
      }
    }, {
      key: "getAsInstanceOf",
      value: function getAsInstanceOf(path, type) {
        return _Tools.Tools.getAsInstanceOf(path, this.props, type);
      }
    }, {
      key: "initProps",
      value: function initProps(attrs) {}
    }, {
      key: "beforePropChange",
      value: function beforePropChange(key, currentValue, nextValue) {}
    }, {
      key: "onPropChange",
      value: function onPropChange(key, value, oldValue) {}
    }, {
      key: "onAttach",
      value: function onAttach() {}
    }, {
      key: "onDetach",
      value: function onDetach() {}
    }, {
      key: "onDomAttrChange",
      value: function onDomAttrChange(attrName, attrValue, oldValue) {}
    }, {
      key: "onDomDetach",
      value: function onDomDetach() {}
    }, {
      key: "render",
      value: function render() {
        throw new Error('Kinkajou.Component.render() must be implemented!');
      }
    }, {
      key: "refresh",
      value: function refresh() {
        /** @type {Node} */
        var parent;
        /** @type {Element} */

        var oldElement;

        if (this.attached) {
          oldElement = this.element;
          parent = oldElement.parentNode;
        }

        var element = this.render();

        _Tools.Tools.assert(element instanceof Element || element instanceof SVGElement || element instanceof VirtualNode, 'Illegal Kinkajou.Component.render() return. Please, return an Element, an SVGElement or use JSX syntax.');

        if (element instanceof VirtualNode) {
          element = VirtualNode.render(element, parent ? parent.namespaceURI : null);
        }

        element.setAttribute('data-kj-comp', '');
        this.element = element;
        element[COMPONENT_ATTR] = this;

        if (parent && oldElement) {
          parent.replaceChild(element, oldElement);
        }

        return element;
      }
    }, {
      key: "dispatchEvent",
      value: function dispatchEvent(event) {
        _Tools.Tools.assertIsInstanceOf(event, Event, 'event', 'Event');

        if (!this.rendered) {
          throw new Error('Kinkajou.Component is not rendered!');
        }

        this.element.dispatchEvent(event);
      }
    }, {
      key: "checkAttached",
      value: function checkAttached() {
        if (!this.attached) {
          throw new Error("".concat(this.is || 'Component', " is not attached"));
        }
      }
    }, {
      key: "checkRendered",
      value: function checkRendered() {
        if (!this.rendered) {
          throw new Error("".concat(this.is || 'Component', " is not rendered"));
        }
      }
    }, {
      key: "clone",
      value: function clone() {
        return Component.create(this.constructor.prototype, this.props);
      }
    }], [{
      key: "getClassName",
      value: function getClassName(constructor) {
        var is = _Tools.Tools.getAsString('is', constructor);

        if (!_Tools.Tools.isString(is)) return undefined;
        var array = is.split('.');
        return array[array.length - 1];
      }
    }, {
      key: "create",
      value: function create(constructor, attrs, children) {
        _Tools.Tools.assertIsFunction(constructor, 'constructor');

        if (attrs != null) _Tools.Tools.assertIsObject(attrs, 'attrs');
        var component = Object.create(constructor.prototype);
        constructor.apply(component, [attrs]);
        component.children = children;
        return component;
      }
    }, {
      key: "from",
      value: function from(node) {
        if (node instanceof VirtualNode) {
          _Tools.Tools.assert(_Tools.Tools.isFunction(node.type), 'node must be a Component');

          return Component.create(node.type, node.attrs, node.children);
        } else {
          _Tools.Tools.assertIsInstanceOf(node, Node, 'node', 'Node');

          var x = _Tools.Tools.get(COMPONENT_ATTR, node);

          return _Tools.Tools.isInstanceOf(x, Component) ? x : null;
        }
      }
    }]);

    return Component;
  }();

  function createElement(tag, attrs) {
    for (var _len2 = arguments.length, children = new Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
      children[_key2 - 2] = arguments[_key2];
    }

    return new VirtualNode(tag, attrs, children);
  }

  function clear(root) {
    _Tools.Tools.assertIsInstanceOf(root, Element, 'root', 'Element');

    var compNodes = root.querySelectorAll('[data-kj-comp]');

    for (var i = 0; i < compNodes.length; i++) {
      var compNode = compNodes[i];
      var component = Component.from(compNode);

      if (component) {
        component.onDetach();
      }
    }

    root.innerHTML = '';
  }

  function render(child, root, shouldClear) {
    _Tools.Tools.assert(child instanceof Node || child instanceof VirtualNode, 'Illegal child argument. It should be a Node or a JSX element.');

    _Tools.Tools.assertIsInstanceOf(root, Element, 'root', 'Element');

    var node;

    if (node instanceof Node) {
      node = child;
    } else {
      node = VirtualNode.render(child, root.namespaceURI);
    }

    if (shouldClear !== false) clear(root);
    root.appendChild(node);
    Component_handleAttachment(node);
  }

  var Kinkajou = {
    CREF: COMPONENT_ATTR,
    $: _Tools.Tools,
    VirtualNode: VirtualNode,
    Component: Component,
    clear: clear,
    createElement: createElement,
    render: render
  };
  _exports.Kinkajou = Kinkajou;

  if (window.__DEV__ === true) {
    window.Kinkajou = Kinkajou;
  }
});
//# sourceMappingURL=Kinkajou.js.map